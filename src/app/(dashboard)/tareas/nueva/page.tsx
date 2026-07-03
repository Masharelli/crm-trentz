import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "../../components/SubmitButton";
import { crearTarea } from "../actions";

const inputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const labelClass = "block text-sm font-medium text-zinc-700";

type Props = {
  searchParams: Promise<{ error?: string; client_id?: string; from?: string }>;
};

export default async function NuevaTareaPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error, client_id, from } = await searchParams;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, display_name")
    .order("display_name", { ascending: true })
    .limit(500);

  const volverA = from === "cliente" && client_id ? `/clientes/${client_id}` : "/tareas";

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href={volverA}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Volver"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Nueva tarea
            </h1>
            <p className="text-sm text-zinc-500">
              Tarea suelta asociada a un cliente
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
            action={crearTarea}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
          >
            <input name="from" type="hidden" value={from ?? ""} />

            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Datos de la tarea
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Cliente <span className="text-rose-500">*</span>
                </label>
                <select
                  className={inputClass}
                  defaultValue={client_id ?? ""}
                  name="client_id"
                  required
                >
                  <option value="" disabled>
                    Selecciona un cliente...
                  </option>
                  {(clients ?? []).map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  Tarea <span className="text-rose-500">*</span>
                </label>
                <input
                  className={inputClass}
                  name="name"
                  placeholder="Llamar para confirmar la propuesta"
                  required
                  type="text"
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Fecha limite</label>
                <input className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 sm:w-72" name="due_date" type="date" />
                <p className="text-xs text-zinc-400">
                  Opcional. Si la dejas vacia, la tarea no marca atraso.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <Link
                href={volverA}
                className="inline-flex h-10 whitespace-nowrap items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancelar
              </Link>
              <SubmitButton label="Crear tarea" pendingLabel="Creando..." />
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
