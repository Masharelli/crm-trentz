import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "../../../components/SubmitButton";
import { actualizarCliente } from "../../actions";
import DeleteClienteButton from "./DeleteClienteButton";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

const inputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const labelClass = "block text-sm font-medium text-zinc-700";

export default async function EditarClientePage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, display_name, legal_name, tax_id, status, primary_email, primary_phone, website, address_line, notes",
    )
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const boundAction = actualizarCliente.bind(null, id);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/clientes"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Volver a clientes"
          >
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Editar cliente
            </h1>
            <p className="truncate text-sm text-zinc-500">{client.display_name}</p>
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

          {/* ── Formulario principal ─────────────────────────── */}
          <form
            action={boundAction}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
          >
            {/* Identificacion */}
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Identificacion
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Nombre comercial <span className="text-rose-500">*</span>
                </label>
                <input
                  className={inputClass}
                  defaultValue={client.display_name}
                  name="display_name"
                  required
                  type="text"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelClass}>Razon social</label>
                  <input
                    className={inputClass}
                    defaultValue={client.legal_name ?? ""}
                    name="legal_name"
                    placeholder="S.A. de C.V."
                    type="text"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>RFC</label>
                  <input
                    className={inputClass}
                    defaultValue={client.tax_id ?? ""}
                    name="tax_id"
                    placeholder="ACN870101ABC"
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Estado</label>
                <select
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 sm:w-72"
                  defaultValue={client.status}
                  name="status"
                >
                  <option value="prospect">Prospecto</option>
                  <option value="active">Activo</option>
                  <option value="paused">Pausado</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>
            </div>

            {/* Contacto */}
            <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Contacto
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelClass}>Correo principal</label>
                  <input
                    className={inputClass}
                    defaultValue={client.primary_email ?? ""}
                    name="primary_email"
                    placeholder="contacto@empresa.com"
                    type="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Telefono principal</label>
                  <input
                    className={inputClass}
                    defaultValue={client.primary_phone ?? ""}
                    name="primary_phone"
                    placeholder="8112345678"
                    type="tel"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={labelClass}>Sitio web</label>
                  <input
                    className={inputClass}
                    defaultValue={client.website ?? ""}
                    name="website"
                    placeholder="https://empresa.com"
                    type="text"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Direccion</label>
                  <input
                    className={inputClass}
                    defaultValue={client.address_line ?? ""}
                    name="address_line"
                    placeholder="Calle, Colonia, Ciudad"
                    type="text"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Notas
              </p>
            </div>
            <div className="px-6 py-6">
              <textarea
                className="min-h-28 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                defaultValue={client.notes ?? ""}
                name="notes"
                placeholder="Informacion adicional del cliente..."
              />
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <Link
                href="/clientes"
                className="inline-flex h-10 whitespace-nowrap items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancelar
              </Link>
              <SubmitButton label="Guardar cambios" pendingLabel="Guardando..." />
            </div>
          </form>

          {/* ── Zona de peligro ──────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm">
            <div className="border-b border-rose-100 bg-rose-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">
                Zona de peligro
              </p>
            </div>
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Eliminar cliente
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Borra permanentemente este cliente junto con todos sus pagos,
                  documentos y notas. Esta accion no se puede deshacer.
                </p>
              </div>
              <DeleteClienteButton id={client.id} nombre={client.display_name} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
