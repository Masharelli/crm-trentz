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

export async function eliminarDocumento(id: string, filePath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.storage.from("client-documents").remove([filePath]);
  await supabase.from("documents").delete().eq("id", id);

  revalidatePath("/documentos");
  redirect(`/documentos?toast=${encodeURIComponent("Documento eliminado correctamente")}`);
}
