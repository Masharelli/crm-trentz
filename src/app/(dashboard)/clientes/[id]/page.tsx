import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

const statusLabel: Record<string, string> = {
  active: "Activo",
  closed: "Cerrado",
  paused: "Pausado",
  prospect: "Prospecto",
};

const statusClass: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  closed: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  paused: "bg-amber-50 text-amber-800 ring-amber-200",
  prospect: "bg-cyan-50 text-cyan-800 ring-cyan-200",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <div className="text-sm text-zinc-900">{children}</div>
    </div>
  );
}

export default async function VerClientePage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, display_name, legal_name, tax_id, status, primary_email, primary_phone, website, address_line, notes",
    )
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/clientes"
              className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              aria-label="Volver a clientes"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
                Detalle del cliente
              </h1>
              <p className="text-sm text-zinc-500">{client.display_name}</p>
            </div>
          </div>
          <Link
            href={`/clientes/${id}/editar`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <Pencil size={14} />
            Editar
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Identificacion */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Identificacion
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <Field label="Nombre comercial">{client.display_name}</Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Razon social">{client.legal_name ?? "—"}</Field>
                <Field label="RFC">{client.tax_id ?? "—"}</Field>
              </div>
              <Field label="Estado">
                <span
                  className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${statusClass[client.status] ?? statusClass.prospect}`}
                >
                  {statusLabel[client.status] ?? client.status}
                </span>
              </Field>
            </div>
          </div>

          {/* Contacto */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Contacto
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-2 gap-5">
                <Field label="Correo principal">
                  {client.primary_email ? (
                    <a
                      href={`mailto:${client.primary_email}`}
                      className="text-zinc-700 underline-offset-2 hover:underline"
                    >
                      {client.primary_email}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Telefono principal">
                  {client.primary_phone ? (
                    <a
                      href={`tel:${client.primary_phone}`}
                      className="text-zinc-700 underline-offset-2 hover:underline"
                    >
                      {client.primary_phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Sitio web">
                  {client.website ? (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-700 underline-offset-2 hover:underline"
                    >
                      {client.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Direccion">{client.address_line ?? "—"}</Field>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Notas
              </p>
            </div>
            <div className="px-6 py-6">
              {client.notes ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-700">{client.notes}</p>
              ) : (
                <p className="text-sm text-zinc-400">Sin notas.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
