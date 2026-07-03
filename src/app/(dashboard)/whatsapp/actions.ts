"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";
import { sendTextMessage } from "@/lib/whatsapp/client";
import { WINDOW_MS } from "@/lib/whatsapp/phone";

const mensajeSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().min(1, "Escribe un mensaje."),
});

export async function enviarMensaje(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = mensajeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/whatsapp?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;
  const back = `/whatsapp?c=${d.conversation_id}`;

  const { data: conversation } = await supabase
    .from("whatsapp_conversations")
    .select("id, wa_id, client_id, last_inbound_at")
    .eq("id", d.conversation_id)
    .maybeSingle();

  if (!conversation) {
    redirect(`/whatsapp?error=${encodeURIComponent("Conversacion no encontrada.")}`);
  }

  // Regla de Meta: mensajes libres solo dentro de las 24h posteriores al
  // ultimo mensaje del cliente. La UI ya lo avisa; aqui se re-valida.
  const windowOpen =
    conversation.last_inbound_at &&
    Date.now() - new Date(conversation.last_inbound_at).getTime() < WINDOW_MS;

  if (!windowOpen) {
    redirect(
      `${back}&error=${encodeURIComponent(
        "La ventana de 24 horas expiro. El cliente debe escribir primero.",
      )}`,
    );
  }

  const body = d.body.trim();
  const result = await sendTextMessage(conversation.wa_id, body);
  const now = new Date().toISOString();

  await supabase.from("whatsapp_messages").insert({
    conversation_id: conversation.id,
    wamid: result.wamid ?? null,
    direction: "outbound",
    source: "api",
    type: "text",
    body,
    status: result.error ? "failed" : "sent",
    error_message: result.error ?? null,
    wa_timestamp: now,
    sent_by: user.id,
  });

  if (result.error) {
    revalidatePath("/whatsapp");
    redirect(
      `${back}&error=${encodeURIComponent("No se pudo enviar el mensaje. Intenta de nuevo.")}`,
    );
  }

  await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: now, last_message_preview: body })
    .eq("id", conversation.id);

  if (conversation.client_id) {
    await logActivity(supabase, {
      actor_id: user.id,
      client_id: conversation.client_id,
      entity_type: "whatsapp_message",
      entity_id: conversation.id,
      action: "sent",
      description: `Mensaje de WhatsApp enviado: ${body.slice(0, 80)}`,
    });
  }

  revalidatePath("/whatsapp");
  redirect(back);
}

export async function marcarLeida(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("whatsapp_conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);

  revalidatePath("/whatsapp");
}

const vincularSchema = z.object({
  conversation_id: z.string().uuid(),
  client_id: z.string().uuid("Selecciona un cliente valido."),
});

export async function vincularCliente(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = vincularSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/whatsapp?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  await supabase
    .from("whatsapp_conversations")
    .update({ client_id: d.client_id, contact_id: null })
    .eq("id", d.conversation_id);

  revalidatePath("/whatsapp");
  redirect(
    `/whatsapp?c=${d.conversation_id}&toast=${encodeURIComponent("Cliente vinculado correctamente")}`,
  );
}

const crearClienteSchema = z.object({
  conversation_id: z.string().uuid(),
  display_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
});

export async function crearClienteDesdeConversacion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = crearClienteSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/whatsapp?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;
  const back = `/whatsapp?c=${d.conversation_id}`;

  const { data: conversation } = await supabase
    .from("whatsapp_conversations")
    .select("id, phone_display")
    .eq("id", d.conversation_id)
    .maybeSingle();

  if (!conversation) {
    redirect(`/whatsapp?error=${encodeURIComponent("Conversacion no encontrada.")}`);
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      display_name: d.display_name.trim(),
      status: "prospect",
      primary_phone: conversation.phone_display,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !client) {
    redirect(`${back}&error=${encodeURIComponent("No se pudo crear el cliente.")}`);
  }

  await supabase
    .from("whatsapp_conversations")
    .update({ client_id: client.id })
    .eq("id", conversation.id);

  await logActivity(supabase, {
    actor_id: user.id,
    client_id: client.id,
    entity_type: "client",
    entity_id: client.id,
    action: "created",
    description: "Cliente creado desde una conversacion de WhatsApp",
  });

  revalidatePath("/whatsapp");
  revalidatePath("/clientes");
  redirect(`${back}&toast=${encodeURIComponent("Cliente creado y vinculado")}`);
}
