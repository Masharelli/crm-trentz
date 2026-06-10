"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const flujoSchema = z.object({
  name: z.string().min(2, "El nombre del flujo debe tener al menos 2 caracteres."),
  description: z.string().optional(),
  steps: z.array(z.string().min(1)).min(1, "Agrega al menos un paso al flujo."),
});

const actualizarFlujoSchema = z.object({
  steps: z
    .array(
      z.object({
        id: z.string().uuid().nullable(),
        name: z.string().min(1, "Los pasos no pueden estar vacios."),
      }),
    )
    .min(1, "El flujo debe tener al menos un paso."),
});

const asignarSchema = z.object({
  flow_id: z.string().uuid("Selecciona un flujo."),
  steps: z
    .array(
      z.object({
        name: z.string().min(1),
        due_date: z.string().nullable(),
      }),
    )
    .min(1),
});

const tareaSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente."),
  name: z.string().min(2, "El nombre de la tarea debe tener al menos 2 caracteres."),
  due_date: z.string().optional(),
});

function nullify(value: string | undefined | null): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

// ── Plantillas de flujo ─────────────────────────────────────────

export async function crearFlujo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let steps: unknown = [];
  try {
    steps = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    steps = [];
  }

  const parsed = flujoSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    steps,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/tareas/flujos/nuevo?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { data: flow, error } = await supabase
    .from("task_flows")
    .insert({
      name: d.name.trim(),
      description: nullify(d.description),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !flow) {
    redirect(
      `/tareas/flujos/nuevo?error=${encodeURIComponent(`No se pudo crear el flujo.${error?.message ? ` (${error.message})` : ""}`)}`,
    );
  }

  const { error: stepsError } = await supabase.from("task_flow_steps").insert(
    d.steps.map((name, index) => ({
      flow_id: flow.id,
      name: name.trim(),
      position: index,
    })),
  );

  if (stepsError) {
    await supabase.from("task_flows").delete().eq("id", flow.id);
    redirect(
      `/tareas/flujos/nuevo?error=${encodeURIComponent(`No se pudieron crear los pasos. (${stepsError.message})`)}`,
    );
  }

  revalidatePath("/tareas/flujos");
  redirect(
    `/tareas/flujos?toast=${encodeURIComponent("Flujo creado correctamente")}`,
  );
}

export async function actualizarFlujo(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "");

  if (name.length < 2) {
    redirect(
      `/tareas/flujos/${id}/editar?error=${encodeURIComponent("El nombre del flujo debe tener al menos 2 caracteres.")}`,
    );
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "null"));
  } catch {
    payload = null;
  }

  const parsed = actualizarFlujoSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/tareas/flujos/${id}/editar?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { error: flowError } = await supabase
    .from("task_flows")
    .update({ name, description: nullify(description) })
    .eq("id", id);

  if (flowError) {
    redirect(
      `/tareas/flujos/${id}/editar?error=${encodeURIComponent(`No se pudo actualizar el flujo. (${flowError.message})`)}`,
    );
  }

  // Borra los pasos que ya no estan, actualiza los existentes e inserta los nuevos.
  // Las asignaciones a clientes son copias, no se ven afectadas.
  const keptIds = d.steps.filter((s) => s.id).map((s) => s.id as string);

  let deleteQuery = supabase.from("task_flow_steps").delete().eq("flow_id", id);
  if (keptIds.length > 0) {
    deleteQuery = deleteQuery.not("id", "in", `(${keptIds.join(",")})`);
  }
  await deleteQuery;

  for (const [index, step] of d.steps.entries()) {
    if (step.id) {
      await supabase
        .from("task_flow_steps")
        .update({ name: step.name.trim(), position: index })
        .eq("id", step.id)
        .eq("flow_id", id);
    } else {
      await supabase
        .from("task_flow_steps")
        .insert({ flow_id: id, name: step.name.trim(), position: index });
    }
  }

  revalidatePath("/tareas/flujos");
  redirect(
    `/tareas/flujos?toast=${encodeURIComponent("Flujo actualizado correctamente")}`,
  );
}

export async function eliminarFlujo(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("task_flows").delete().eq("id", id);
  revalidatePath("/tareas/flujos");
  redirect(
    `/tareas/flujos?toast=${encodeURIComponent("Flujo eliminado correctamente")}`,
  );
}

// ── Asignacion de flujos a clientes ─────────────────────────────

export async function asignarFlujo(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let payload: unknown = null;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "null"));
  } catch {
    payload = null;
  }

  const parsed = asignarSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(
      `/clientes/${clientId}/asignar-flujo?error=${encodeURIComponent(message)}`,
    );
  }

  const d = parsed.data;

  const { data: flow } = await supabase
    .from("task_flows")
    .select("id, name")
    .eq("id", d.flow_id)
    .maybeSingle();

  if (!flow) {
    redirect(
      `/clientes/${clientId}/asignar-flujo?error=${encodeURIComponent("El flujo seleccionado no existe.")}`,
    );
  }

  const { data: clientFlow, error } = await supabase
    .from("client_flows")
    .insert({
      client_id: clientId,
      flow_id: flow.id,
      name: flow.name,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !clientFlow) {
    redirect(
      `/clientes/${clientId}/asignar-flujo?error=${encodeURIComponent(`No se pudo asignar el flujo.${error?.message ? ` (${error.message})` : ""}`)}`,
    );
  }

  const { error: tasksError } = await supabase.from("client_tasks").insert(
    d.steps.map((step, index) => ({
      client_id: clientId,
      client_flow_id: clientFlow.id,
      name: step.name.trim(),
      position: index,
      due_date: nullify(step.due_date),
      created_by: user.id,
    })),
  );

  if (tasksError) {
    await supabase.from("client_flows").delete().eq("id", clientFlow.id);
    redirect(
      `/clientes/${clientId}/asignar-flujo?error=${encodeURIComponent(`No se pudieron crear las tareas. (${tasksError.message})`)}`,
    );
  }

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/tareas");
  redirect(
    `/clientes/${clientId}?toast=${encodeURIComponent("Flujo asignado correctamente")}`,
  );
}

export async function quitarFlujoDeCliente(clientFlowId: string, clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("client_flows").delete().eq("id", clientFlowId);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/tareas");
}

// ── Tareas ──────────────────────────────────────────────────────

export async function crearTarea(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const from = String(formData.get("from") ?? "");

  const parsed = tareaSchema.safeParse({
    client_id: formData.get("client_id"),
    name: formData.get("name"),
    due_date: formData.get("due_date") ?? undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/tareas/nueva?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { error } = await supabase.from("client_tasks").insert({
    client_id: d.client_id,
    name: d.name.trim(),
    due_date: nullify(d.due_date),
    created_by: user.id,
  });

  if (error) {
    redirect(
      `/tareas/nueva?error=${encodeURIComponent(`No se pudo crear la tarea. (${error.message})`)}`,
    );
  }

  revalidatePath("/tareas");
  revalidatePath(`/clientes/${d.client_id}`);

  const destino =
    from === "cliente" ? `/clientes/${d.client_id}` : "/tareas";
  redirect(`${destino}?toast=${encodeURIComponent("Tarea creada correctamente")}`);
}

export async function toggleTarea(
  taskId: string,
  clientId: string,
  completed: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("client_tasks")
    .update(
      completed
        ? { completed_at: new Date().toISOString(), completed_by: user.id }
        : { completed_at: null, completed_by: null },
    )
    .eq("id", taskId);

  revalidatePath("/tareas");
  revalidatePath(`/clientes/${clientId}`);
}

export async function eliminarTarea(taskId: string, clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("client_tasks").delete().eq("id", taskId);
  revalidatePath("/tareas");
  revalidatePath(`/clientes/${clientId}`);
}
