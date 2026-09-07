import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_GRAPH_API_VERSION = "v23.0";

type EventInput = {
  eventId: string;
  eventName: "LeadSubmitted" | "Purchase";
  clientId?: string | null;
  conversationId: string;
  paymentId?: string | null;
  occurredAt: string;
  ctwaClid: string;
  whatsappBusinessAccountId: string;
  value?: number;
  currency?: string;
};

function getConfig() {
  const datasetId = process.env.META_DATASET_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const graphApiVersion =
    process.env.META_GRAPH_API_VERSION ?? DEFAULT_GRAPH_API_VERSION;

  if (!datasetId || !accessToken || !pageId) {
    throw new Error("Faltan META_DATASET_ID, META_CAPI_ACCESS_TOKEN o META_PAGE_ID");
  }

  if (!/^v\d+\.\d+$/.test(graphApiVersion)) {
    throw new Error("META_GRAPH_API_VERSION no tiene un formato valido");
  }

  return { datasetId, accessToken, pageId, graphApiVersion };
}

export async function sendMetaConversion(
  admin: SupabaseClient,
  input: EventInput,
): Promise<void> {
  const { error: insertError } = await admin.from("meta_conversion_events").insert({
    event_id: input.eventId,
    event_name: input.eventName,
    client_id: input.clientId ?? null,
    conversation_id: input.conversationId,
    payment_id: input.paymentId ?? null,
  });

  if (insertError?.code === "23505") {
    const { data: existing } = await admin
      .from("meta_conversion_events")
      .select("status")
      .eq("event_id", input.eventId)
      .maybeSingle();

    // Los eventos confirmados nunca se duplican. Un evento fallido puede
    // reintentarse si el webhook o la accion de pago vuelve a dispararlo.
    if (!existing || existing.status !== "failed") return;

    const { data: retried, error: retryError } = await admin
      .from("meta_conversion_events")
      .update({ status: "pending", last_error: null })
      .eq("event_id", input.eventId)
      .eq("status", "failed")
      .select("event_id")
      .maybeSingle();
    if (retryError || !retried) {
      console.error(
        "[meta] no se pudo preparar el reintento:",
        retryError?.message ?? "el evento ya esta siendo procesado",
      );
      return;
    }
  }
  if (insertError) {
    if (insertError.code !== "23505") {
      console.error("[meta] no se pudo registrar el evento:", insertError.message);
      return;
    }
  }

  try {
    const { datasetId, accessToken, pageId, graphApiVersion } = getConfig();
    const eventTime = new Date(input.occurredAt).getTime();
    if (!Number.isFinite(eventTime)) {
      throw new Error("La fecha del evento no es valida");
    }

    const userData: Record<string, string> = {
      page_id: pageId,
      ctwa_clid: input.ctwaClid,
      whatsapp_business_account_id: input.whatsappBusinessAccountId,
    };

    const event: Record<string, unknown> = {
      event_name: input.eventName,
      event_time: Math.floor(eventTime / 1000),
      event_id: input.eventId,
      action_source: "business_messaging",
      messaging_channel: "whatsapp",
      user_data: userData,
    };
    if (input.eventName === "Purchase") {
      const value = input.value;
      if (
        !input.currency ||
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value <= 0
      ) {
        throw new Error("Purchase requiere un valor positivo y una moneda");
      }
      event.custom_data = {
        currency: input.currency.toUpperCase(),
        value,
      };
    }

    const url = `https://graph.facebook.com/${graphApiVersion}/${datasetId}/events`;
    const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        data: [event],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      }),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.error?.message ?? `Meta Graph API ${response.status}`);
    }

    await admin
      .from("meta_conversion_events")
      .update({ status: "sent", response: body, sent_at: new Date().toISOString() })
      .eq("event_id", input.eventId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[meta] envio fallido:", message);
    await admin
      .from("meta_conversion_events")
      .update({ status: "failed", last_error: message })
      .eq("event_id", input.eventId);
  }
}

export async function sendMetaPurchase(
  admin: SupabaseClient,
  paymentId: string,
): Promise<void> {
  const { data: payment, error } = await admin
    .from("payments")
    .select("id, client_id, amount, currency, paid_at")
    .eq("id", paymentId)
    .eq("status", "paid")
    .single();

  if (error || !payment) return;

  // La señal de negocio es la primera mensualidad cobrada. Las renovaciones
  // posteriores no deben optimizarse como nuevas altas.
  const { count: previousPaidCount, error: countError } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", payment.client_id)
    .eq("status", "paid")
    .neq("id", payment.id);

  if (countError || (previousPaidCount ?? 0) > 0) return;

  const { data: previousPurchaseEvent, error: purchaseEventError } = await admin
    .from("meta_conversion_events")
    .select("event_id")
    .eq("client_id", payment.client_id)
    .eq("event_name", "Purchase")
    .neq("payment_id", payment.id)
    .limit(1)
    .maybeSingle();

  if (purchaseEventError || previousPurchaseEvent) return;

  const { data: conversation } = await admin
    .from("whatsapp_conversations")
    .select("id, ctwa_clid, whatsapp_business_account_id")
    .eq("client_id", payment.client_id)
    .not("ctwa_clid", "is", null)
    .not("whatsapp_business_account_id", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation?.ctwa_clid || !conversation.whatsapp_business_account_id) return;

  await sendMetaConversion(admin, {
    eventId: `purchase:${payment.id}`,
    eventName: "Purchase",
    clientId: payment.client_id,
    conversationId: conversation.id,
    paymentId: payment.id,
    occurredAt: payment.paid_at ?? new Date().toISOString(),
    ctwaClid: conversation.ctwa_clid,
    whatsappBusinessAccountId: conversation.whatsapp_business_account_id,
    value: Number(payment.amount),
    currency: payment.currency,
  });
}
