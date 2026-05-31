"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const pagoSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente valido."),
  concept: z.string().min(2, "El concepto debe tener al menos 2 caracteres."),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0."),
  currency: z.string().length(3).default("MXN"),
  discount_pct: z.coerce.number().min(0).max(100).default(0),
  due_date: z.string().min(1, "La fecha de vencimiento es obligatoria."),
  paid_at: z.string().optional(),
  status: z
    .enum(["pending", "scheduled", "paid", "overdue", "canceled"])
    .default("pending"),
  reminder_days_before: z.coerce.number().min(0).max(90).default(3),
  notes: z.string().optional(),
});

function nullify(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

export async function crearPago(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData);
  const parsed = pagoSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/pagos/nuevo?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { error } = await supabase.from("payments").insert({
    client_id: d.client_id,
    concept: d.concept.trim(),
    amount: d.amount,
    currency: d.currency,
    discount_pct: d.discount_pct,
    due_date: d.due_date,
    paid_at: nullify(d.paid_at),
    status: d.status,
    reminder_days_before: d.reminder_days_before,
    notes: nullify(d.notes),
    created_by: user.id,
  });

  if (error) {
    redirect(
      `/pagos/nuevo?error=${encodeURIComponent("No se pudo guardar el pago. Intenta de nuevo.")}`,
    );
  }

  revalidatePath("/pagos");
  revalidatePath("/");
  redirect(`/pagos?toast=${encodeURIComponent("Pago registrado correctamente")}`);
}

export async function actualizarPago(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData);
  const parsed = pagoSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/pagos/${id}/editar?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { error } = await supabase
    .from("payments")
    .update({
      client_id: d.client_id,
      concept: d.concept.trim(),
      amount: d.amount,
      currency: d.currency,
      discount_pct: d.discount_pct,
      due_date: d.due_date,
      paid_at: nullify(d.paid_at),
      status: d.status,
      reminder_days_before: d.reminder_days_before,
      notes: nullify(d.notes),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/pagos/${id}/editar?error=${encodeURIComponent("No se pudo actualizar el pago. Intenta de nuevo.")}`,
    );
  }

  revalidatePath("/pagos");
  revalidatePath("/");
  redirect(`/pagos?toast=${encodeURIComponent("Pago actualizado correctamente")}`);
}

export async function eliminarPago(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("payments").delete().eq("id", id);
  revalidatePath("/pagos");
  revalidatePath("/");
  redirect("/pagos");
}
