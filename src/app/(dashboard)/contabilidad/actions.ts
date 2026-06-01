"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const gastoSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0."),
  category: z
    .enum([
      "rent",
      "payroll",
      "software",
      "services",
      "marketing",
      "taxes",
      "equipment",
      "maintenance",
      "travel",
      "other",
    ])
    .default("other"),
  currency: z.string().length(3).default("MXN"),
  description: z
    .string()
    .min(2, "La descripcion debe tener al menos 2 caracteres."),
  expense_date: z.string().min(1, "La fecha del gasto es obligatoria."),
  notes: z.string().optional(),
  payment_method: z.string().optional(),
  receipt_url: z
    .string()
    .url("Escribe una URL valida para el comprobante.")
    .optional()
    .or(z.literal("")),
  recurring: z.coerce.boolean().default(false),
  vendor: z.string().optional(),
});

function nullify(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

function contabilidadRedirect(date: string, currency: string, toast: string) {
  const params = new URLSearchParams({
    currency: currency.toUpperCase(),
    month: date.slice(0, 7),
    toast,
  });

  redirect(`/contabilidad?${params.toString()}`);
}

export async function crearGasto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData);
  const parsed = gastoSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/contabilidad/nuevo?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;
  const currency = d.currency.toUpperCase();

  const { error } = await supabase.from("office_expenses").insert({
    amount: d.amount,
    category: d.category,
    created_by: user.id,
    currency,
    description: d.description.trim(),
    expense_date: d.expense_date,
    notes: nullify(d.notes),
    payment_method: nullify(d.payment_method),
    receipt_url: nullify(d.receipt_url),
    recurring: d.recurring,
    vendor: nullify(d.vendor),
  });

  if (error) {
    redirect(
      `/contabilidad/nuevo?error=${encodeURIComponent("No se pudo guardar el gasto. Intenta de nuevo.")}`,
    );
  }

  revalidatePath("/contabilidad");
  revalidatePath("/");
  contabilidadRedirect(d.expense_date, currency, "Gasto registrado correctamente");
}

export async function actualizarGasto(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData);
  const parsed = gastoSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(
      `/contabilidad/${id}/editar?error=${encodeURIComponent(message)}`,
    );
  }

  const d = parsed.data;
  const currency = d.currency.toUpperCase();

  const { error } = await supabase
    .from("office_expenses")
    .update({
      amount: d.amount,
      category: d.category,
      currency,
      description: d.description.trim(),
      expense_date: d.expense_date,
      notes: nullify(d.notes),
      payment_method: nullify(d.payment_method),
      receipt_url: nullify(d.receipt_url),
      recurring: d.recurring,
      vendor: nullify(d.vendor),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/contabilidad/${id}/editar?error=${encodeURIComponent("No se pudo actualizar el gasto. Intenta de nuevo.")}`,
    );
  }

  revalidatePath("/contabilidad");
  revalidatePath("/");
  contabilidadRedirect(d.expense_date, currency, "Gasto actualizado correctamente");
}

export async function eliminarGasto(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("office_expenses").delete().eq("id", id);
  revalidatePath("/contabilidad");
  revalidatePath("/");
  redirect("/contabilidad");
}
