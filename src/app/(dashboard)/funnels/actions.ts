"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const funnelSchema = z.object({
  name: z.string().min(2, "El nombre del funnel debe tener al menos 2 caracteres."),
  description: z.string().optional(),
  stages: z
    .array(z.string().min(1))
    .min(1, "Agrega al menos una etapa al funnel."),
});

const actualizarSchema = z.object({
  stages: z
    .array(
      z.object({
        key: z.string(),
        id: z.string().uuid().nullable(),
        name: z.string().min(1, "Las etapas no pueden estar vacias."),
      }),
    )
    .min(1, "El funnel debe tener al menos una etapa."),
  removals: z.array(
    z.object({
      id: z.string().uuid(),
      targetKey: z.string().nullable(),
    }),
  ),
});

function nullify(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

export async function crearFunnel(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let stages: unknown = [];
  try {
    stages = JSON.parse(String(formData.get("stages") ?? "[]"));
  } catch {
    stages = [];
  }

  const parsed = funnelSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    stages,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/funnels/nuevo?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { data: funnel, error } = await supabase
    .from("funnels")
    .insert({
      name: d.name.trim(),
      description: nullify(d.description),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !funnel) {
    const detail = error?.message ? ` (${error.message})` : "";
    redirect(
      `/funnels/nuevo?error=${encodeURIComponent(`No se pudo crear el funnel.${detail}`)}`,
    );
  }

  const { error: stagesError } = await supabase.from("funnel_stages").insert(
    d.stages.map((name, index) => ({
      funnel_id: funnel.id,
      name: name.trim(),
      position: index,
    })),
  );

  if (stagesError) {
    await supabase.from("funnels").delete().eq("id", funnel.id);
    redirect(
      `/funnels/nuevo?error=${encodeURIComponent(`No se pudieron crear las etapas. (${stagesError.message})`)}`,
    );
  }

  revalidatePath("/funnels");
  redirect(
    `/funnels/${funnel.id}?toast=${encodeURIComponent("Funnel creado correctamente")}`,
  );
}

export async function actualizarFunnel(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "");

  if (name.length < 2) {
    redirect(
      `/funnels/${id}/editar?error=${encodeURIComponent("El nombre del funnel debe tener al menos 2 caracteres.")}`,
    );
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "null"));
  } catch {
    payload = null;
  }

  const parsed = actualizarSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/funnels/${id}/editar?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { error: funnelError } = await supabase
    .from("funnels")
    .update({
      name,
      description: nullify(description),
    })
    .eq("id", id);

  if (funnelError) {
    redirect(
      `/funnels/${id}/editar?error=${encodeURIComponent(`No se pudo actualizar el funnel. (${funnelError.message})`)}`,
    );
  }

  // Inserta etapas nuevas y actualiza nombre/posicion de las existentes.
  const idsByKey = new Map<string, string>();

  for (const [index, stage] of d.stages.entries()) {
    if (stage.id) {
      idsByKey.set(stage.key, stage.id);
      await supabase
        .from("funnel_stages")
        .update({ name: stage.name.trim(), position: index })
        .eq("id", stage.id)
        .eq("funnel_id", id);
    } else {
      const { data: created } = await supabase
        .from("funnel_stages")
        .insert({ funnel_id: id, name: stage.name.trim(), position: index })
        .select("id")
        .single();
      if (created) idsByKey.set(stage.key, created.id);
    }
  }

  // Reubica clientes de etapas eliminadas y borra esas etapas.
  for (const removal of d.removals) {
    const targetId = removal.targetKey ? idsByKey.get(removal.targetKey) : null;

    if (targetId) {
      await supabase
        .from("funnel_clients")
        .update({ stage_id: targetId })
        .eq("stage_id", removal.id);
    } else {
      await supabase.from("funnel_clients").delete().eq("stage_id", removal.id);
    }

    await supabase
      .from("funnel_stages")
      .delete()
      .eq("id", removal.id)
      .eq("funnel_id", id);
  }

  revalidatePath("/funnels");
  revalidatePath(`/funnels/${id}`);
  redirect(
    `/funnels/${id}?toast=${encodeURIComponent("Funnel actualizado correctamente")}`,
  );
}

export async function eliminarFunnel(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("funnels").delete().eq("id", id);
  revalidatePath("/funnels");
  redirect(
    `/funnels?toast=${encodeURIComponent("Funnel eliminado correctamente")}`,
  );
}

export async function agregarClientesAFunnel(
  funnelId: string,
  stageId: string,
  clientIds: string[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (clientIds.length === 0) return;

  await supabase.from("funnel_clients").upsert(
    clientIds.map((clientId) => ({
      funnel_id: funnelId,
      stage_id: stageId,
      client_id: clientId,
      added_by: user.id,
    })),
    { ignoreDuplicates: true, onConflict: "funnel_id,client_id" },
  );

  revalidatePath(`/funnels/${funnelId}`);
}

export async function moverClienteDeEtapa(
  funnelId: string,
  funnelClientId: string,
  stageId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("funnel_clients")
    .update({ stage_id: stageId })
    .eq("id", funnelClientId)
    .eq("funnel_id", funnelId);

  revalidatePath(`/funnels/${funnelId}`);
}

export async function quitarClienteDeFunnel(
  funnelId: string,
  funnelClientId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("funnel_clients")
    .delete()
    .eq("id", funnelClientId)
    .eq("funnel_id", funnelId);

  revalidatePath(`/funnels/${funnelId}`);
}
