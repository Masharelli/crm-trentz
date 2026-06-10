import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "../../../../components/SubmitButton";
import { crearContacto } from "../../../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

const inputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const labelClass = "block text-sm font-medium text-zinc-700";

export default async function NuevoContactoPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const { data: client } = await supabase
    .from("clients")
    .select("id, display_name")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const crearConCliente = crearContacto.bind(null, id);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/clientes/${id}`}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Volver al cliente"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Nuevo contacto
            </h1>
            <p className="text-sm text-zinc-500">{client.display_name}</p>
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
            action={crearConCliente}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
          >
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Datos del contacto
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                  className={inputClass}
                  name="full_name"
                  placeholder="Ej. María González"
                  required
                  type="text"
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Puesto</label>
                <input
                  className={inputClass}
                  name="position"
                  placeholder="Ej. Directora de marketing"
                  type="text"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Correo</label>
                  <input
                    className={inputClass}
                    name="email"
                    placeholder="maria@empresa.com"
                    type="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Teléfono / WhatsApp</label>
                  <input
                    className={inputClass}
                    name="phone"
                    placeholder="8112345678"
                    type="tel"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
                <input
                  className="size-4 rounded border-zinc-300 accent-zinc-950"
                  name="is_primary"
                  type="checkbox"
                />
                Contacto principal del cliente
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <p className="text-xs text-zinc-400">
                Los campos con <span className="text-rose-500">*</span> son requeridos
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href={`/clientes/${id}`}
                  className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Cancelar
                </Link>
                <SubmitButton label="Guardar contacto" pendingLabel="Guardando..." />
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
