import {
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  FileText,
  WalletCards,
} from "lucide-react";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

// Portal publico del cliente: con la liga /p/<token> consulta sus pagos,
// documentos y formularios pendientes. Solo lectura, sin cuenta.

export const metadata: Metadata = {
  title: "Portal de cliente | Trentz",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  params: Promise<{ token: string }>;
};

type PaymentRow = {
  id: string;
  concept: string;
  amount: number;
  currency: string;
  discount_pct: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  is_month_zero: boolean;
  second_month_amount: number | null;
  second_month_due_date: string | null;
};

function netAmount(p: PaymentRow): number {
  if (p.is_month_zero || p.status === "month_zero") {
    return Number(p.second_month_amount ?? 0);
  }
  return Number(p.amount) * (1 - Number(p.discount_pct ?? 0) / 100);
}

function dueDateOf(p: PaymentRow): string {
  return p.is_month_zero || p.status === "month_zero"
    ? (p.second_month_due_date ?? p.due_date)
    : p.due_date;
}

function formatMoney(amount: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {children}
        <p className="mt-8 text-center text-xs text-zinc-400">
          Trentz · Portal seguro, solo accesible con esta liga.
        </p>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3 sm:px-6">
        <span className="text-zinc-400">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

export default async function PortalClientePage({ params }: Props) {
  const { token } = await params;

  const invalido = (
    <Shell>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-16 text-center shadow-sm sm:px-6">
        <div className="grid size-14 place-items-center rounded-full bg-zinc-100 text-zinc-400">
          <FileQuestion size={28} />
        </div>
        <p className="text-lg font-semibold text-zinc-950">Liga no válida</p>
        <p className="max-w-md text-sm text-zinc-500">
          Esta liga no existe o fue desactivada. Pide una nueva a tu contacto
          en Trentz.
        </p>
      </div>
    </Shell>
  );

  if (!UUID_RE.test(token)) return invalido;

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, display_name")
    .eq("portal_token", token)
    .eq("portal_enabled", true)
    .maybeSingle();

  if (!client) return invalido;

  const [{ data: paymentsData }, { data: documentsData }, { data: formsData }] =
    await Promise.all([
      admin
        .from("payments")
        .select(
          "id, concept, amount, currency, discount_pct, due_date, paid_at, status, is_month_zero, second_month_amount, second_month_due_date",
        )
        .eq("client_id", client.id)
        .neq("status", "canceled")
        .order("due_date", { ascending: true }),
      admin
        .from("documents")
        .select("id, file_name, file_path, created_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("form_assignments")
        .select("id, form_name, status, token")
        .eq("client_id", client.id)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false }),
    ]);

  const payments = (paymentsData ?? []) as PaymentRow[];
  const hoy = new Date().toISOString().slice(0, 10);

  const abiertos = payments.filter((p) =>
    ["pending", "scheduled", "month_zero", "overdue"].includes(p.status),
  );
  const pagados = payments
    .filter((p) => p.status === "paid")
    .sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""))
    .slice(0, 10);
  const formularios = formsData ?? [];

  // Ligas firmadas (1 hora) para descargar documentos del bucket privado.
  const documents = await Promise.all(
    (documentsData ?? []).map(async (doc) => {
      const { data } = await admin.storage
        .from("client-documents")
        .createSignedUrl(doc.file_path, 3600);
      return { ...doc, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <Shell>
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-5 shadow-sm sm:px-6">
          <p className="text-sm text-zinc-500">Portal de cliente</p>
          <h1 className="mt-0.5 text-xl font-semibold text-zinc-950">
            {client.display_name}
          </h1>
        </div>

        {/* Pagos pendientes */}
        <Card icon={<WalletCards size={14} />} title="Pagos pendientes">
          {abiertos.length === 0 ? (
            <div className="flex items-center gap-2.5 px-4 py-5 sm:px-6">
              <CheckCircle2 className="text-emerald-500" size={18} />
              <p className="text-sm text-zinc-600">
                Estás al corriente. No tienes pagos pendientes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {abiertos.map((p) => {
                const vencido =
                  p.status === "overdue" || dueDateOf(p) < hoy;
                return (
                  <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6" key={p.id}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-950">
                        {p.concept}
                      </p>
                      <p
                        className={`mt-0.5 text-xs ${vencido ? "font-semibold text-rose-600" : "text-zinc-500"}`}
                      >
                        {vencido ? "Venció el" : "Vence el"} {formatDate(dueDateOf(p))}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-zinc-950">
                      {formatMoney(netAmount(p), p.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Formularios por completar */}
        {formularios.length > 0 ? (
          <Card icon={<ClipboardList size={14} />} title="Formularios por completar">
            <div className="divide-y divide-zinc-100">
              {formularios.map((f) => (
                <a
                  className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-zinc-50 sm:px-6"
                  href={`/f/${f.token}`}
                  key={f.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-950">
                      {f.form_name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {f.status === "in_progress"
                        ? "En progreso — continúa donde te quedaste"
                        : "Pendiente de responder"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white">
                    {f.status === "in_progress" ? "Continuar" : "Responder"}
                  </span>
                </a>
              ))}
            </div>
          </Card>
        ) : null}

        {/* Documentos */}
        <Card icon={<FileText size={14} />} title="Tus documentos">
          {documents.length === 0 ? (
            <div className="px-4 py-5 sm:px-6">
              <p className="text-sm text-zinc-400">
                Aún no hay documentos compartidos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {documents.map((doc) => (
                <div className="flex items-center gap-3 px-4 py-3 sm:px-6" key={doc.id}>
                  <p className="min-w-0 flex-1 truncate text-sm text-zinc-800">
                    {doc.file_name}
                  </p>
                  {doc.url ? (
                    <a
                      className="shrink-0 text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline"
                      href={doc.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Descargar
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Historial */}
        {pagados.length > 0 ? (
          <Card icon={<CheckCircle2 size={14} />} title="Pagos realizados">
            <div className="divide-y divide-zinc-100">
              {pagados.map((p) => (
                <div className="flex items-center gap-3 px-4 py-3 sm:px-6" key={p.id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-800">{p.concept}</p>
                    {p.paid_at ? (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        Pagado el {formatDate(p.paid_at)}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm font-medium text-emerald-700">
                    {formatMoney(netAmount(p), p.currency)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </Shell>
  );
}
