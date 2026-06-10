import {
  ClipboardList,
  Contact,
  FileText,
  Search,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Busqueda global: clientes, contactos, pagos, documentos y formularios.

type Props = {
  searchParams: Promise<{ q?: string }>;
};

const clientStatusLabel: Record<string, string> = {
  active: "Activo",
  closed: "Cerrado",
  paused: "Pausado",
  prospect: "Prospecto",
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
    maximumFractionDigits: 2,
  }).format(amount);
}

function SectionCard({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-6 py-3">
        <span className="text-zinc-400">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {title} ({count})
        </p>
      </div>
      <div className="divide-y divide-zinc-100">{children}</div>
    </div>
  );
}

function ResultRow({
  href,
  title,
  subtitle,
  meta,
}: {
  href: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-6 py-3 transition hover:bg-zinc-50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-950">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
      {meta ? (
        <span className="shrink-0 text-xs font-medium text-zinc-400">{meta}</span>
      ) : null}
    </Link>
  );
}

export default async function BuscarPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let clients: {
    id: string;
    display_name: string;
    legal_name: string | null;
    status: string;
  }[] = [];
  let contacts: {
    id: string;
    client_id: string;
    full_name: string;
    position: string | null;
    clients: { display_name: string } | null;
  }[] = [];
  let payments: {
    id: string;
    concept: string;
    amount: number;
    currency: string;
    due_date: string;
    clients: { display_name: string } | null;
  }[] = [];
  let documents: {
    id: string;
    client_id: string | null;
    file_name: string;
    clients: { display_name: string } | null;
  }[] = [];
  let assignments: {
    id: string;
    form_name: string;
    status: string;
    clients: { display_name: string } | null;
  }[] = [];

  if (query.length >= 2) {
    const like = `%${query}%`;
    const [c, ct, p, d, fa] = await Promise.all([
      supabase
        .from("clients")
        .select("id, display_name, legal_name, status")
        .or(
          `display_name.ilike.${like},legal_name.ilike.${like},tax_id.ilike.${like},primary_email.ilike.${like}`,
        )
        .limit(10),
      supabase
        .from("client_contacts")
        .select("id, client_id, full_name, position, clients(display_name)")
        .or(`full_name.ilike.${like},email.ilike.${like}`)
        .limit(10),
      supabase
        .from("payments")
        .select("id, concept, amount, currency, due_date, clients(display_name)")
        .ilike("concept", like)
        .limit(10),
      supabase
        .from("documents")
        .select("id, client_id, file_name, clients(display_name)")
        .ilike("file_name", like)
        .limit(10),
      supabase
        .from("form_assignments")
        .select("id, form_name, status, clients(display_name)")
        .ilike("form_name", like)
        .limit(10),
    ]);

    clients = (c.data ?? []) as typeof clients;
    contacts = (ct.data ?? []) as unknown as typeof contacts;
    payments = (p.data ?? []) as unknown as typeof payments;
    documents = (d.data ?? []) as unknown as typeof documents;
    assignments = (fa.data ?? []) as unknown as typeof assignments;
  }

  const total =
    clients.length +
    contacts.length +
    payments.length +
    documents.length +
    assignments.length;

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
            Búsqueda
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {query.length >= 2
              ? `${total} resultados para "${query}"`
              : "Busca en clientes, contactos, pagos, documentos y formularios"}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <form action="/buscar">
            <label className="flex h-12 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-500 shadow-sm focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100">
              <Search size={18} />
              <input
                autoFocus
                className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400"
                defaultValue={query}
                name="q"
                placeholder="Buscar cliente, pago o documento"
                type="search"
              />
            </label>
          </form>

          {query.length >= 2 && total === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-16 text-center shadow-sm">
              <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <Search size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                Sin resultados para &quot;{query}&quot;
              </p>
              <p className="text-sm text-zinc-500">
                Intenta con otro nombre, concepto o archivo.
              </p>
            </div>
          ) : null}

          <SectionCard
            icon={<UsersRound size={14} />}
            title="Clientes"
            count={clients.length}
          >
            {clients.map((client) => (
              <ResultRow
                key={client.id}
                href={`/clientes/${client.id}`}
                title={client.display_name}
                subtitle={client.legal_name}
                meta={clientStatusLabel[client.status] ?? client.status}
              />
            ))}
          </SectionCard>

          <SectionCard
            icon={<Contact size={14} />}
            title="Contactos"
            count={contacts.length}
          >
            {contacts.map((contact) => (
              <ResultRow
                key={contact.id}
                href={`/clientes/${contact.client_id}`}
                title={contact.full_name}
                subtitle={[contact.position, contact.clients?.display_name]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </SectionCard>

          <SectionCard
            icon={<WalletCards size={14} />}
            title="Pagos"
            count={payments.length}
          >
            {payments.map((payment) => (
              <ResultRow
                key={payment.id}
                href={`/pagos/${payment.id}`}
                title={payment.concept}
                subtitle={payment.clients?.display_name}
                meta={formatMoney(payment.amount, payment.currency)}
              />
            ))}
          </SectionCard>

          <SectionCard
            icon={<FileText size={14} />}
            title="Documentos"
            count={documents.length}
          >
            {documents.map((doc) => (
              <ResultRow
                key={doc.id}
                href="/documentos"
                title={doc.file_name}
                subtitle={doc.clients?.display_name}
              />
            ))}
          </SectionCard>

          <SectionCard
            icon={<ClipboardList size={14} />}
            title="Formularios asignados"
            count={assignments.length}
          >
            {assignments.map((assignment) => (
              <ResultRow
                key={assignment.id}
                href={`/formularios/respuestas/${assignment.id}`}
                title={assignment.form_name}
                subtitle={assignment.clients?.display_name}
              />
            ))}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
