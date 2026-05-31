import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NuevoCorreoForm from "./NuevoCorreoForm";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NuevoCorreoPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await searchParams;

  const { data: clientes } = await supabase
    .from("clients")
    .select("id, display_name, primary_email")
    .in("status", ["active", "prospect", "paused"])
    .order("display_name");

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/correos"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Volver a correos"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Redactar correo
            </h1>
            <p className="text-sm text-zinc-500">
              El correo se enviara desde contacto@trentz.com.mx
            </p>
          </div>
        </div>
      </header>

      <NuevoCorreoForm clientes={clientes ?? []} error={error} />
    </>
  );
}
