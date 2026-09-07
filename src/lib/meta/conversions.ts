import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const GRAPH_URL = "https://graph.facebook.com/v23.0";

type EventInput = {
  eventId: string;
  eventName: "LeadSubmitted" | "Purchase";
  clientId?: string | null;
  conversationId: string;
  paymentId?: string | null;
  occurredAt: string;
  waId: string;
  ctwaClid: string;
  whatsappBusinessAccountId: string;
  email?: string | null;
  value?: number;
  currency?: string;
};

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getConfig() {
  const datasetId = process.env.META_DATASET_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;

  if (!datasetId || !accessToken || !pageId) {
    throw new Error("Faltan META_DATASET_ID, META_CAPI_ACCESS_TOKEN o META_PAGE_ID");
  }

  return { datasetId, accessToken, pageId };
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

  if (insertError?.code === "23505") return;
  if (insertError) {
    console.error("[meta] no se pudo registrar el evento:", insertError.message);
    return;
  }

  try {
    const { datasetId, accessToken, pageId } = getConfig();
    const userData: Record<string, string> = {
      page_id: pageId,
      ctwa_clid: input.ctwaClid,
      whatsapp_business_account_id: input.whatsappBusinessAccountId,
      ph: hash(input.waId.replace(/\D/g, "")),
    };
    if (input.email) userData.em = hash(input.email.trim().toLowerCase());

    const event: Record<string, unknown> = {
      event_name: input.eventName,
      event_time: Math.floor(new Date(input.occurredAt).getTime() / 1000),
      event_id: input.eventId,
      action_source: "business_messaging",
      messaging_channel: "whatsapp",
      user_data: userData,
    };
    if (input.eventName === "Purchase") {
      event.custom_data = { currency: input.currency, value: input.value };
    }

    const url = new URL(`${GRAPH_URL}/${datasetId}/events`);
    url.searchParams.set("access_token", accessToken);
    const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    .select("id, client_id, amount, currency, paid_at, clients(primary_email)")
    .eq("id", paymentId)
    .eq("status", "paid")
    .single();

  if (error || !payment) return;

  const { data: conversation } = await admin
    .from("whatsapp_conversations")
    .select("id, wa_id, ctwa_clid, whatsapp_business_account_id")
    .eq("client_id", payment.client_id)
    .not("ctwa_clid", "is", null)
    .not("whatsapp_business_account_id", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation?.ctwa_clid || !conversation.whatsapp_business_account_id) return;

  const client = payment.clients as unknown as { primary_email: string | null } | null;
  await sendMetaConversion(admin, {
    eventId: `purchase:${payment.id}`,
    eventName: "Purchase",
    clientId: payment.client_id,
    conversationId: conversation.id,
    paymentId: payment.id,
    occurredAt: payment.paid_at ?? new Date().toISOString(),
    waId: conversation.wa_id,
    ctwaClid: conversation.ctwa_clid,
    whatsappBusinessAccountId: conversation.whatsapp_business_account_id,
    email: client?.primary_email,
    value: Number(payment.amount),
    currency: payment.currency,
  });
}
