import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actualizarGasto } from "../../actions";
import { currencies, expenseCategories } from "../../constants";
import DeleteGastoButton from "./DeleteGastoButton";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

const inputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const labelClass = "block text-sm font-medium text-zinc-700";

function sectionHeader(title: string, border: "top" | "both" = "both") {
  return (
    <div
      className={`bg-zinc-50 px-6 py-3 ${
        border === "both"
          ? "border-y border-zinc-100"
          : "border-b border-zinc-100"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {title}
      </p>
    </div>
  );
}

export default async function EditarGastoPage({
  params,
  searchParams,
}: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const { data: expense } = await supabase
    .from("office_expenses")
    .select(
      "id, description, category, amount, currency, expense_date, vendor, payment_method, receipt_url, recurring, notes",
    )
    .eq("id", id)
    .maybeSingle();

  if (!expense) notFound();

  const boundAction = actualizarGasto.bind(null, id);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/contabilidad"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Volver a contabilidad"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Editar gasto
            </h1>
            <p className="text-sm text-zinc-500">{expense.description}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          <form
            action={boundAction}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
          >
            {sectionHeader("Detalle del gasto", "top")}
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Descripcion <span className="text-rose-500">*</span>
                </label>
                <input
                  className={inputClass}
                  defaultValue={expense.description}
                  name="description"
                  required
                  type="text"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Categoria <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className={inputClass}
                    defaultValue={expense.category}
                    name="category"
                  >
                    {expenseCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Fecha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    defaultValue={expense.expense_date}
                    name="expense_date"
                    required
                    type="date"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Monto <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="h-11 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-zinc-400"
                      defaultValue={expense.currency}
                      name="currency"
                    >
                      {currencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputClass}
                      defaultValue={String(expense.amount)}
                      min="0.01"
                      name="amount"
                      required
                      step="0.01"
                      type="number"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Proveedor</label>
                  <input
                    className={inputClass}
                    defaultValue={expense.vendor ?? ""}
                    name="vendor"
                    type="text"
                  />
                </div>
              </div>
            </div>

            {sectionHeader("Pago y comprobante")}
            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelClass}>Metodo de pago</label>
                  <input
                    className={inputClass}
                    defaultValue={expense.payment_method ?? ""}
                    name="payment_method"
                    type="text"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>URL de comprobante</label>
                  <input
                    className={inputClass}
                    defaultValue={expense.receipt_url ?? ""}
                    name="receipt_url"
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-medium text-zinc-700">
                <input
                  className="size-4 rounded border-zinc-300"
                  defaultChecked={expense.recurring}
                  name="recurring"
                  type="checkbox"
                  value="true"
                />
                Es un gasto recurrente
              </label>
            </div>

            {sectionHeader("Notas")}
            <div className="px-6 py-6">
              <textarea
                className="min-h-24 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                defaultValue={expense.notes ?? ""}
                name="notes"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <Link
                href="/contabilidad"
                className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancelar
              </Link>
              <button
                className="inline-flex h-10 items-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                type="submit"
              >
                Guardar cambios
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm">
            <div className="border-b border-rose-100 bg-rose-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">
                Zona de peligro
              </p>
            </div>
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Eliminar gasto
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Borra permanentemente este gasto. Esta accion no se puede
                  deshacer.
                </p>
              </div>
              <DeleteGastoButton
                descripcion={expense.description}
                id={expense.id}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
