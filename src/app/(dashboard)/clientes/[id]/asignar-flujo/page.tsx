import { ArrowLeft, Plus, Workflow } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AsignarFlujoForm from "./AsignarFlujoForm";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

type FlowRow = {
  id: string;
  name: string;
  description: string | null;
  task_flow_steps: { id: string; name: string; position: number }[];
};

export default async function AsignarFlujoPage({ params, searchParams }: Props) {
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

  const { data } = await supabase
    .from("task_flows")
    .select("id, name, description, task_flow_steps(id, name, position)")
    .order("name", { ascending: true });

  const flows = ((data ?? []) as unknown as FlowRow[]).map((flow) => ({
    ...flow,
    task_flow_steps: [...flow.task_flow_steps].sort(
      (a, b) => a.position - b.position,
    ),
  }));

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/clientes/${client.id}`}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Volver al cliente"
          >
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Asignar flujo
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

          {flows.length > 0 ? (
            <AsignarFlujoForm clientId={client.id} flows={flows} />
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                  <Workflow size={22} />
                </div>
                <p className="text-sm font-medium text-zinc-700">
                  No hay flujos creados
                </p>
                <p className="text-sm text-zinc-500">
                  Primero crea una plantilla de flujo con sus pasos.
                </p>
                <Link
                  href="/tareas/flujos/nuevo"
                  className="mt-2 inline-flex whitespace-nowrap h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Nuevo flujo
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
