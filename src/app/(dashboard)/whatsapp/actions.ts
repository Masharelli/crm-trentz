"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { canWrite, getCurrentRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  listApprovedTemplates,
  sendImageMessage,
  sendTemplateMessage,
  sendTextMessage,
  uploadImage,
} from "@/lib/whatsapp/client";
import { WINDOW_MS } from "@/lib/whatsapp/phone";

const mensajeSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Escribe un mensaje.")
    .max(4096, "El mensaje no puede superar 4096 caracteres."),
});

async function requireWriter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  if (!canWrite(role)) {
    redirect(
      `/whatsapp?error=${encodeURIComponent("Tu cuenta es de solo lectura y no puede realizar esta accion.")}`,
    );
  }

  return { supabase, user };
}

export async function enviarMensaje(formData: FormData) {
  const { supabase, user } = await requireWriter();

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

  const body = d.body;
  const now = new Date().toISOString();

  // Guardar primero evita que un mensaje salga de Meta si RLS o la base
  // rechazan la operacion. Despues se completa la fila con el wamid real.
  const { data: pendingMessage, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversation.id,
      wamid: null,
      direction: "outbound",
      source: "api",
      type: "text",
      body,
      status: "pending",
      error_message: null,
      wa_timestamp: now,
      sent_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !pendingMessage) {
    redirect(
      `${back}&error=${encodeURIComponent("No se pudo preparar el mensaje. No fue enviado.")}`,
    );
  }

  const result = await sendTextMessage(conversation.wa_id, body);

  const { error: updateMessageError } = await supabase
    .from("whatsapp_messages")
    .update({
      wamid: result.wamid ?? null,
      status: result.error ? "failed" : "sent",
      error_message: result.error ?? null,
    })
    .eq("id", pendingMessage.id);

  if (updateMessageError) {
    console.error("whatsapp message update:", updateMessageError.message);
  }

  if (result.error) {
    revalidatePath("/whatsapp");
    redirect(
      `${back}&error=${encodeURIComponent("No se pudo enviar el mensaje. Intenta de nuevo.")}`,
    );
  }

  const { error: conversationUpdateError } = await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: now, last_message_preview: body })
    .eq("id", conversation.id);

  if (conversationUpdateError) {
    redirect(
      `${back}&error=${encodeURIComponent("El mensaje fue enviado, pero la bandeja no pudo actualizarse. Recarga la pagina.")}`,
    );
  }

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

const imagenSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().trim().max(1024, "El texto de la imagen es demasiado largo."),
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

function hasValidImageSignature(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer);
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

export async function enviarImagen(formData: FormData) {
  const { supabase, user } = await requireWriter();
  const parsed = imagenSchema.safeParse({
    conversation_id: formData.get("conversation_id"),
    body: formData.get("body") ?? "",
  });
  const imageFile = formData.get("image");

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/whatsapp?error=${encodeURIComponent(message)}`);
  }

  const back = `/whatsapp?c=${parsed.data.conversation_id}`;
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    redirect(`${back}&error=${encodeURIComponent("Selecciona una imagen.")}`);
  }
  if (!IMAGE_TYPES.has(imageFile.type)) {
    redirect(
      `${back}&error=${encodeURIComponent("Solo se permiten imagenes JPG o PNG.")}`,
    );
  }
  if (imageFile.size > MAX_IMAGE_BYTES) {
    redirect(
      `${back}&error=${encodeURIComponent("La imagen no puede superar 5 MB.")}`,
    );
  }

  const { data: conversation } = await supabase
    .from("whatsapp_conversations")
    .select("id, wa_id, client_id, last_inbound_at")
    .eq("id", parsed.data.conversation_id)
    .maybeSingle();
  if (!conversation) {
    redirect(`${back}&error=${encodeURIComponent("Conversacion no encontrada.")}`);
  }

  const windowOpen =
    conversation.last_inbound_at &&
    Date.now() - new Date(conversation.last_inbound_at).getTime() < WINDOW_MS;
  if (!windowOpen) {
    redirect(
      `${back}&error=${encodeURIComponent("La ventana de 24 horas expiro. Para enviar una imagen, el cliente debe responder primero.")}`,
    );
  }

  const buffer = await imageFile.arrayBuffer();
  if (!hasValidImageSignature(buffer, imageFile.type)) {
    redirect(
      `${back}&error=${encodeURIComponent("El archivo no contiene una imagen valida.")}`,
    );
  }

  const caption = parsed.data.body;
  const preview = caption || "[Imagen]";
  const now = new Date().toISOString();
  const { data: pendingMessage, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversation.id,
      wamid: null,
      direction: "outbound",
      source: "api",
      type: "image",
      body: preview,
      status: "pending",
      wa_timestamp: now,
      sent_by: user.id,
    })
    .select("id")
    .single();
  if (insertError || !pendingMessage) {
    redirect(
      `${back}&error=${encodeURIComponent("No se pudo preparar la imagen. No fue enviada.")}`,
    );
  }

  const admin = createAdminClient();
  const extension = imageFile.type === "image/png" ? "png" : "jpg";
  const mediaPath = `${conversation.id}/${pendingMessage.id}.${extension}`;
  const { error: storageError } = await admin.storage
    .from("whatsapp-media")
    .upload(mediaPath, buffer, {
      contentType: imageFile.type,
      upsert: true,
    });
  if (storageError) {
    await admin
      .from("whatsapp_messages")
      .update({ status: "failed", error_message: storageError.message })
      .eq("id", pendingMessage.id);
    redirect(
      `${back}&error=${encodeURIComponent("No se pudo guardar la imagen. Intenta de nuevo.")}`,
    );
  }

  await admin
    .from("whatsapp_messages")
    .update({ media_path: mediaPath, media_mime_type: imageFile.type })
    .eq("id", pendingMessage.id);

  const uploaded = await uploadImage(
    new Blob([buffer], { type: imageFile.type }),
    imageFile.name || `imagen.${extension}`,
  );
  if (!uploaded.mediaId) {
    await admin
      .from("whatsapp_messages")
      .update({
        status: "failed",
        error_message: uploaded.error ?? "Meta no acepto la imagen.",
      })
      .eq("id", pendingMessage.id);
    revalidatePath("/whatsapp");
    redirect(
      `${back}&error=${encodeURIComponent("Meta no pudo recibir la imagen. Intenta de nuevo.")}`,
    );
  }

  const result = await sendImageMessage(
    conversation.wa_id,
    uploaded.mediaId,
    caption || undefined,
  );
  await admin
    .from("whatsapp_messages")
    .update({
      wamid: result.wamid ?? null,
      status: result.error ? "failed" : "sent",
      error_message: result.error ?? null,
    })
    .eq("id", pendingMessage.id);

  if (result.error) {
    revalidatePath("/whatsapp");
    redirect(
      `${back}&error=${encodeURIComponent("No se pudo enviar la imagen. Intenta de nuevo.")}`,
    );
  }

  const { error: conversationError } = await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: now, last_message_preview: preview })
    .eq("id", conversation.id);
  if (conversationError) {
    redirect(
      `${back}&error=${encodeURIComponent("La imagen fue enviada, pero la bandeja no pudo actualizarse.")}`,
    );
  }

  if (conversation.client_id) {
    await logActivity(supabase, {
      actor_id: user.id,
      client_id: conversation.client_id,
      entity_type: "whatsapp_message",
      entity_id: conversation.id,
      action: "sent",
      description: caption
        ? `Imagen de WhatsApp enviada: ${caption.slice(0, 80)}`
        : "Imagen de WhatsApp enviada",
    });
  }

  revalidatePath("/whatsapp");
  redirect(back);
}

const plantillaSchema = z.object({
  conversation_id: z.string().uuid(),
  template_name: z.string().regex(/^[a-z0-9_]+$/),
  template_language: z.string().min(2).max(16),
});

export async function enviarPlantilla(formData: FormData) {
  const { supabase, user } = await requireWriter();
  const parsed = plantillaSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(
      `/whatsapp?error=${encodeURIComponent("Selecciona una plantilla valida.")}`,
    );
  }

  const d = parsed.data;
  const back = `/whatsapp?c=${d.conversation_id}`;
  const { data: conversation } = await supabase
    .from("whatsapp_conversations")
    .select("id, wa_id, client_id")
    .eq("id", d.conversation_id)
    .maybeSingle();

  if (!conversation) {
    redirect(`${back}&error=${encodeURIComponent("Conversacion no encontrada.")}`);
  }

  const templates = await listApprovedTemplates();
  const template = templates.find(
    (item) =>
      item.name === d.template_name && item.language === d.template_language,
  );
  if (!template) {
    redirect(
      `${back}&error=${encodeURIComponent("La plantilla ya no esta disponible o no esta aprobada.")}`,
    );
  }

  const variables = Array.from({ length: template.variableCount }, (_, index) =>
    String(formData.get(`variable_${index + 1}`) ?? "").trim(),
  );
  if (variables.some((value) => !value)) {
    redirect(
      `${back}&error=${encodeURIComponent("Completa todos los datos de la plantilla.")}`,
    );
  }

  const body = template.body.replace(/\{\{(\d+)\}\}/g, (_, rawIndex: string) => {
    return variables[Number(rawIndex) - 1] ?? `{{${rawIndex}}}`;
  });
  const now = new Date().toISOString();

  const { data: pendingMessage, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversation.id,
      wamid: null,
      direction: "outbound",
      source: "api",
      type: "template",
      body,
      status: "pending",
      wa_timestamp: now,
      sent_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !pendingMessage) {
    redirect(
      `${back}&error=${encodeURIComponent("No se pudo preparar la plantilla. No fue enviada.")}`,
    );
  }

  const result = await sendTemplateMessage(conversation.wa_id, template, variables);
  const { error: updateError } = await supabase
    .from("whatsapp_messages")
    .update({
      wamid: result.wamid ?? null,
      status: result.error ? "failed" : "sent",
      error_message: result.error ?? null,
    })
    .eq("id", pendingMessage.id);

  if (updateError) {
    console.error("whatsapp template update:", updateError.message);
  }
  if (result.error) {
    revalidatePath("/whatsapp");
    redirect(
      `${back}&error=${encodeURIComponent("Meta rechazo la plantilla. Revisa sus datos e intenta de nuevo.")}`,
    );
  }

  const { error: conversationError } = await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: now, last_message_preview: body })
    .eq("id", conversation.id);
  if (conversationError) {
    redirect(
      `${back}&error=${encodeURIComponent("La plantilla fue enviada, pero la bandeja no pudo actualizarse.")}`,
    );
  }

  if (conversation.client_id) {
    await logActivity(supabase, {
      actor_id: user.id,
      client_id: conversation.client_id,
      entity_type: "whatsapp_message",
      entity_id: conversation.id,
      action: "sent",
      description: `Plantilla de WhatsApp enviada: ${template.name}`,
    });
  }

  revalidatePath("/whatsapp");
  redirect(`${back}&toast=${encodeURIComponent("Plantilla enviada")}`);
}

const responsableSchema = z.object({
  conversation_id: z.string().uuid(),
  assigned_to: z.union([z.literal(""), z.string().uuid()]),
});

export async function actualizarResponsable(formData: FormData) {
  const { supabase } = await requireWriter();
  const parsed = responsableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/whatsapp?error=${encodeURIComponent("Selecciona un responsable valido.")}`,
    );
  }

  const { conversation_id, assigned_to } = parsed.data;
  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ assigned_to: assigned_to || null })
    .eq("id", conversation_id);

  if (error) {
    redirect(
      `/whatsapp?c=${conversation_id}&error=${encodeURIComponent("No se pudo actualizar el responsable.")}`,
    );
  }

  revalidatePath("/whatsapp");
  redirect(
    `/whatsapp?c=${conversation_id}&toast=${encodeURIComponent("Responsable actualizado")}`,
  );
}

const estadoSchema = z.object({
  conversation_id: z.string().uuid(),
  status: z.enum(["open", "resolved"]),
});

export async function actualizarEstado(formData: FormData) {
  const { supabase } = await requireWriter();
  const parsed = estadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/whatsapp?error=${encodeURIComponent("Estado invalido.")}`);
  }

  const { conversation_id, status } = parsed.data;
  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ inbox_status: status })
    .eq("id", conversation_id);

  if (error) {
    redirect(
      `/whatsapp?c=${conversation_id}&error=${encodeURIComponent("No se pudo actualizar el estado.")}`,
    );
  }

  revalidatePath("/whatsapp");
  redirect(
    `/whatsapp?c=${conversation_id}&toast=${encodeURIComponent(
      status === "resolved" ? "Conversacion resuelta" : "Conversacion reabierta",
    )}`,
  );
}

export async function marcarLeida(
  conversationId: string,
  seenThrough: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  if (!z.string().uuid().safeParse(conversationId).success || !seenThrough) {
    return;
  }

  const seenAt = new Date(seenThrough);
  if (Number.isNaN(seenAt.getTime())) return;

  await supabase
    .from("whatsapp_conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId)
    .lte("last_message_at", seenAt.toISOString());

  revalidatePath("/whatsapp");
}

const vincularSchema = z.object({
  conversation_id: z.string().uuid(),
  client_id: z.string().uuid("Selecciona un cliente valido."),
});

export async function vincularCliente(formData: FormData) {
  const { supabase } = await requireWriter();

  const parsed = vincularSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/whatsapp?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ client_id: d.client_id, contact_id: null })
    .eq("id", d.conversation_id);

  if (error) {
    redirect(
      `/whatsapp?c=${d.conversation_id}&error=${encodeURIComponent("No se pudo vincular el cliente. Intenta de nuevo.")}`,
    );
  }

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
  const { supabase, user } = await requireWriter();

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

  const { error: linkError } = await supabase
    .from("whatsapp_conversations")
    .update({ client_id: client.id })
    .eq("id", conversation.id);

  if (linkError) {
    redirect(
      `${back}&error=${encodeURIComponent("El cliente se creo, pero no se pudo vincular a la conversacion.")}`,
    );
  }

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
