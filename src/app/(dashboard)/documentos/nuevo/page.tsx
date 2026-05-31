import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { subirDocumento } from "../actions";

type Props = {
  searchParams: Promise<{ error?: string; client_id?: string }>;
};

const inputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const labelClass = "block text-sm font-medium text-zinc-700";

export default async function NuevoDocumentoPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error, client_id: preselectedClientId } = await searchParams;

  const { data: clientes } = await supabase
    .from("clients")
    .select("id, display_name")
    .in("status", ["active", "prospect", "paused"])
    .order("display_name");

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/documentos"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Volver a documentos"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Subir documento
            </h1>
            <p className="text-sm text-zinc-500">
              PDF, imagen, Word o Excel — max. 10 MB
            </p>
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
            action={subirDocumento}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
          >
            {/* Archivo */}
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Archivo
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Seleccionar archivo <span className="text-rose-500">*</span>
                </label>
                <input
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                  className="block w-full rounded-md border border-zinc-200 bg-white text-sm text-zinc-700 outline-none file:mr-4 file:h-full file:border-0 file:border-r file:border-zinc-200 file:bg-zinc-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-100"
                  name="file"
                  required
                  type="file"
                />
                <p className="text-xs text-zinc-400">
                  Formatos aceptados: PDF, PNG, JPG, DOCX, XLSX
                </p>
              </div>
            </div>

            {/* Detalles */}
            <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Detalles
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Cliente <span className="text-rose-500">*</span>
                </label>
                <select
                  className={inputClass}
                  defaultValue={preselectedClientId ?? ""}
                  name="client_id"
                  required
                >
                  <option value="" disabled>
                    Selecciona un cliente...
                  </option>
                  {(clientes ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Tipo de documento</label>
                <select className="h-11 w-72 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100" name="document_type" defaultValue="other">
                  <option value="contract">Contrato</option>
                  <option value="identification">Identificacion</option>
                  <option value="tax">Fiscal / Factura</option>
                  <option value="payment_receipt">Recibo de pago</option>
                  <option value="legal">Legal</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <Link
                href="/documentos"
                className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancelar
              </Link>
              <button
                className="inline-flex h-10 items-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                type="submit"
              >
                Subir documento
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
