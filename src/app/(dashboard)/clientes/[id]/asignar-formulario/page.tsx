import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "../../../components/SubmitButton";
import { asignarFormulario } from "../../../formularios/actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

type FormRow = {
  id: string;
  name: string;
  description: string | null;
  form_fields: { count: number }[];
};

export default async function AsignarFormularioPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const [{ data: client }, { data: formsData }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, display_name")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("forms")
      .select("id, name, description, form_fields(count)")
      .order("name", { ascending: true }),
  ]);

  if (!client) notFound();

  const forms = (formsData ?? []) as unknown as FormRow[];

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
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Asignar formulario
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

          {forms.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-sm font-medium text-zinc-700">
                No tienes formularios todavía.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Crea uno primero para poder asignarlo a este cliente.
              </p>
              <Link
                href="/formularios/nuevo"
                className="mt-4 inline-flex whitespace-nowrap h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Nuevo formulario
              </Link>
            </div>
          ) : (
            <form
              action={asignarFormulario}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
            >
              <input name="client_id" type="hidden" value={id} />
              <input name="from" type="hidden" value="cliente" />

              <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Formulario
                </p>
              </div>
              <div className="space-y-4 px-6 py-6">
                <p className="text-sm text-zinc-500">
                  Al asignarlo se genera una liga única para que{" "}
                  {client.display_name} lo responda sin necesidad de cuenta. La
                  liga aparecerá en el detalle del cliente lista para copiar.
                </p>
                <select
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  defaultValue=""
                  name="form_id"
                  required
                >
                  <option value="" disabled>
                    Selecciona un formulario...
                  </option>
                  {forms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.name} ({form.form_fields[0]?.count ?? 0} preguntas)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
                <Link
                  href={`/clientes/${id}`}
                  className="inline-flex h-10 whitespace-nowrap items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Cancelar
                </Link>
                <SubmitButton label="Generar liga" pendingLabel="Generando..." />
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
