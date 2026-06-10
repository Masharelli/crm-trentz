import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditarFunnelForm from "./EditarFunnelForm";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditarFunnelPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const { data: funnel } = await supabase
    .from("funnels")
    .select("id, name, description")
    .eq("id", id)
    .maybeSingle();

  if (!funnel) notFound();

  const { data: stages } = await supabase
    .from("funnel_stages")
    .select("id, name, position, funnel_clients(count)")
    .eq("funnel_id", id)
    .order("position", { ascending: true });

  const initialStages = (stages ?? []).map((stage) => ({
    id: stage.id,
    name: stage.name,
    clientCount: stage.funnel_clients?.[0]?.count ?? 0,
  }));

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/funnels/${funnel.id}`}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Volver al funnel"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Editar funnel
            </h1>
            <p className="text-sm text-zinc-500">{funnel.name}</p>
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

          <EditarFunnelForm
            funnelId={funnel.id}
            funnelName={funnel.name}
            funnelDescription={funnel.description}
            initialStages={initialStages}
          />
        </div>
      </div>
    </>
  );
}
