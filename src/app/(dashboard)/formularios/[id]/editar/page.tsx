import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sortFields, type FormFieldDef } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { actualizarFormulario } from "../../actions";
import FormBuilder from "../../FormBuilder";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditarFormularioPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const { data: form } = await supabase
    .from("forms")
    .select(
      "id, name, description, form_fields(id, label, help_text, field_type, options, is_required, position)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!form) notFound();

  const actualizarConId = actualizarFormulario.bind(null, id);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/formularios/${id}`}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Volver al formulario"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Editar formulario
            </h1>
            <p className="text-sm text-zinc-500">
              Las ligas ya asignadas conservan su propia copia de las preguntas.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          <FormBuilder
            action={actualizarConId}
            cancelHref={`/formularios/${id}`}
            submitLabel="Guardar cambios"
            pendingLabel="Guardando..."
            initialName={form.name}
            initialDescription={form.description ?? ""}
            initialFields={sortFields(form.form_fields as FormFieldDef[])}
          />
        </div>
      </div>
    </>
  );
}
