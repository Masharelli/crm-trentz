"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";

const docSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente valido."),
  document_type: z
    .enum(["contract", "identification", "tax", "payment_receipt", "legal", "other"])
    .default("other"),
});

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export async function subirDocumento(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    redirect(
      `/documentos/nuevo?error=${encodeURIComponent("Selecciona un archivo.")}`,
    );
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    redirect(
      `/documentos/nuevo?error=${encodeURIComponent("El archivo debe pesar 20 MB o menos.")}`,
    );
  }

  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    redirect(
      `/documentos/nuevo?error=${encodeURIComponent("Formato no permitido. Usa PDF, Word, Excel, JPG o PNG.")}`,
    );
  }

  const parsed = docSchema.safeParse({
    client_id: formData.get("client_id"),
    document_type: formData.get("document_type"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/documentos/nuevo?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storagePath = `${d.client_id}/${crypto.randomUUID()}-${safeName}`;

  const bytes = await file.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from("client-documents")
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (storageError) {
    redirect(
      `/documentos/nuevo?error=${encodeURIComponent("No se pudo subir el archivo. Intenta de nuevo.")}`,
    );
  }

  const { data: doc, error: dbError } = await supabase
    .from("documents")
    .insert({
      client_id: d.client_id,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: storagePath,
      file_size: file.size,
      mime_type: file.type || null,
      document_type: d.document_type,
    })
    .select("id")
    .single();

  if (dbError) {
    await supabase.storage.from("client-documents").remove([storagePath]);
    redirect(
      `/documentos/nuevo?error=${encodeURIComponent("No se pudo guardar el documento. Intenta de nuevo.")}`,
    );
  }

  await logActivity(supabase, {
    actor_id: user.id,
    client_id: d.client_id,
    entity_type: "document",
    entity_id: doc?.id ?? null,
    action: "uploaded",
    description: `Documento subido: ${file.name}`,
  });

  revalidatePath("/documentos");
  revalidatePath(`/clientes/${d.client_id}`);
  redirect(
    `/documentos?toast=${encodeURIComponent("Documento subido correctamente")}`,
  );
}

export async function eliminarDocumento(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: document, error: lookupError } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  if (lookupError || !document) {
    redirect(
      `/documentos?error=${encodeURIComponent("El documento no existe o no se pudo consultar.")}`,
    );
  }

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (dbError) {
    redirect(
      `/documentos?error=${encodeURIComponent("No se pudo eliminar el documento. Verifica tus permisos.")}`,
    );
  }

  const { error: storageError } = await supabase.storage
    .from("client-documents")
    .remove([document.file_path]);

  if (storageError) {
    revalidatePath("/documentos");
    redirect(
      `/documentos?error=${encodeURIComponent("El registro se elimino, pero el archivo no pudo limpiarse del almacenamiento.")}`,
    );
  }

  revalidatePath("/documentos");
  redirect(`/documentos?toast=${encodeURIComponent("Documento eliminado correctamente")}`);
}
