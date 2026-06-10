import { ClipboardList, Eye, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

type FormRow = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  form_fields: { count: number }[];
  form_assignments: { count: number }[];
};

export default async function FormulariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("forms")
    .select(
      "id, name, description, updated_at, form_fields(count), form_assignments(count)",
    )
    .order("updated_at", { ascending: false });

  const forms = (data ?? []) as unknown as FormRow[];

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Formularios
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {forms.length} {forms.length === 1 ? "formulario" : "formularios"}
            </p>
          </div>
          <Link
            href="/formularios/nuevo"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Nuevo formulario
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-zinc-200 bg-white">
          {forms.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nombre</th>
                    <th className="px-5 py-3 font-semibold">Preguntas</th>
                    <th className="px-5 py-3 font-semibold">Asignaciones</th>
                    <th className="px-5 py-3 font-semibold">Actualizado</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {forms.map((form) => (
                    <tr key={form.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-zinc-950">{form.name}</p>
                        {form.description ? (
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {form.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {form.form_fields[0]?.count ?? 0}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {form.form_assignments[0]?.count ?? 0}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(form.updated_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/formularios/${form.id}/editar`}
                            className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                            aria-label={`Editar ${form.name}`}
                          >
                            <Pencil size={15} />
                          </Link>
                          <Link
                            href={`/formularios/${form.id}`}
                            className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                            aria-label={`Ver ${form.name}`}
                          >
                            <Eye size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <ClipboardList size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                Sin formularios registrados
              </p>
              <p className="text-sm text-zinc-500">
                Crea un formulario, asígnalo a un cliente y compártele la liga
                para que lo responda.
              </p>
              <Link
                href="/formularios/nuevo"
                className="mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <Plus size={16} />
                Nuevo formulario
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
