import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AgregarClientesButton from "./AgregarClientesButton";
import FunnelBoard from "./FunnelBoard";

type Props = {
  params: Promise<{ id: string }>;
};

type MemberRow = {
  id: string;
  stage_id: string;
  clients: {
    id: string;
    display_name: string;
    status: string;
    primary_email: string | null;
  } | null;
};

export default async function FunnelPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;

  const { data: funnel } = await supabase
    .from("funnels")
    .select("id, name, description")
    .eq("id", id)
    .maybeSingle();

  if (!funnel) notFound();

  const [{ data: stages }, { data: memberRows }, { data: candidates }] =
    await Promise.all([
      supabase
        .from("funnel_stages")
        .select("id, name, position")
        .eq("funnel_id", id)
        .order("position", { ascending: true }),
      supabase
        .from("funnel_clients")
        .select("id, stage_id, clients(id, display_name, status, primary_email)")
        .eq("funnel_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("clients")
        .select("id, display_name, status")
        .in("status", ["active", "prospect"])
        .order("display_name", { ascending: true })
        .limit(500),
    ]);

  const members = ((memberRows ?? []) as unknown as MemberRow[])
    .filter((row) => row.clients !== null)
    .map((row) => ({
      id: row.id,
      stageId: row.stage_id,
      client: row.clients!,
    }));

  const inFunnel = new Set(members.map((m) => m.client.id));
  const availableClients = (candidates ?? []).filter(
    (client) => !inFunnel.has(client.id),
  );

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/funnels"
              className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              aria-label="Volver a funnels"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
                {funnel.name}
              </h1>
              <p className="text-sm text-zinc-500">
                {funnel.description ??
                  `${members.length} ${members.length === 1 ? "cliente" : "clientes"} en el funnel`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/funnels/${funnel.id}/editar`}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              <Pencil size={15} />
              Editar
            </Link>
            <AgregarClientesButton
              funnelId={funnel.id}
              stages={stages ?? []}
              availableClients={availableClients}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <FunnelBoard
          funnelId={funnel.id}
          stages={stages ?? []}
          members={members}
        />
      </div>
    </>
  );
}
