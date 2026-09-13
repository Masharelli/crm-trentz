import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  UserRoundCheck,
} from "lucide-react";
import { addDaysToDateKey, businessDateKey } from "@/lib/business-date";

const paymentStatus = {
  canceled: {
    label: "Cancelado",
    statusClass: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  },
  month_zero: {
    label: "Mes cero",
    statusClass: "bg-violet-50 text-violet-800 ring-violet-200",
  },
  overdue: {
    label: "Vencido",
    statusClass: "bg-rose-50 text-rose-800 ring-rose-200",
  },
  paid: {
    label: "Pagado",
    statusClass: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  pending: {
    label: "Pendiente",
    statusClass: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  scheduled: {
    label: "Programado",
    statusClass: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  },
};

const clientStatus = {
  active: "Cliente activo",
  closed: "Cerrado",
  paused: "Pausado",
  prospect: "Prospecto",
};

const documentStatus = {
  approved: "Aprobado",
  archived: "Archivado",
  rejected: "Rechazado",
  reviewing: "Revisar",
  uploaded: "Subido",
};

const documentTypes = {
  contract: "Contrato",
  identification: "Identificacion",
  legal: "Legal",
  other: "Otro",
  payment_receipt: "Pago",
  tax: "Fiscal",
};

type DashboardPayment = {
  amount: number | string;
  clients?: {
    display_name?: string | null;
    primary_email?: string | null;
  } | null;
  currency?: string | null;
  due_date: string;
  id: string;
  status: keyof typeof paymentStatus;
};

type DashboardClient = {
  assignee?:
    | { full_name?: string | null }
    | { full_name?: string | null }[]
    | null;
  display_name: string;
  id: string;
  status: keyof typeof clientStatus;
  updated_at: string;
};

type DashboardDocument = {
  clients?: {
    display_name?: string | null;
  } | null;
  document_type: keyof typeof documentTypes;
  file_name: string;
  file_path: string;
  id: string;
  status: keyof typeof documentStatus;
};

type OverduePaymentSummary = {
  count: number | string;
  total: number | string;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatMoney(value: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export async function getDashboardData(supabase: SupabaseClient) {
  const today = businessDateKey();
  const nextSevenDays = addDaysToDateKey(today, 7);

  const [
    activeClients,
    upcomingPaymentsCount,
    overduePayments,
    totalDocuments,
    documentsToReview,
    payments,
    clients,
    documents,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .gte("due_date", today)
      .lte("due_date", nextSevenDays)
      .eq("is_month_zero", false)
      .in("status", ["pending", "scheduled"]),
    supabase.rpc("get_overdue_payment_summary", { p_today: today }),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .in("status", ["uploaded", "reviewing"]),
    supabase
      .from("payments")
      .select(
        "id, amount, currency, due_date, status, clients(display_name, primary_email)",
      )
      .eq("is_month_zero", false)
      .in("status", ["pending", "scheduled", "overdue"])
      .order("due_date", { ascending: true })
      .limit(4),
    supabase
      .from("clients")
      .select(
        "id, display_name, status, updated_at, assignee:profiles!clients_assigned_to_fkey(full_name)",
      )
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("documents")
      .select(
        "id, file_name, file_path, document_type, status, clients(display_name)",
      )
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const queryError = [
    activeClients,
    upcomingPaymentsCount,
    overduePayments,
    totalDocuments,
    documentsToReview,
    payments,
    clients,
    documents,
  ].find((result) => result.error)?.error;

  if (queryError) {
    throw new Error("No se pudo cargar el resumen del dashboard.");
  }

  const documentRows = (documents.data ?? []) as DashboardDocument[];
  const signedDocumentUrls = new Map<string, string>();
  if (documentRows.length > 0) {
    const { data: signed } = await supabase.storage
      .from("client-documents")
      .createSignedUrls(
        documentRows.map((document) => document.file_path),
        3600,
      );

    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) {
        signedDocumentUrls.set(item.path, item.signedUrl);
      }
    }
  }

  const overdueSummary = overduePayments.data as unknown as
    | OverduePaymentSummary
    | null;
  const overdueTotal = Number(overdueSummary?.total ?? 0);
  const overdueCount = Number(overdueSummary?.count ?? 0);
  const reviewCount = documentsToReview.count ?? 0;
  const upcomingCount = upcomingPaymentsCount.count ?? 0;

  return {
    documentQueue: documentRows.map((document) => ({
      client: document.clients?.display_name ?? "Sin cliente",
      file: document.file_name,
      id: document.id,
      status: documentStatus[document.status] ?? "Subido",
      type: documentTypes[document.document_type] ?? "Otro",
      url: signedDocumentUrls.get(document.file_path) ?? null,
    })),
    metrics: [
      {
        detail: "Registrados como activos",
        href: "/clientes?status=active",
        icon: UserRoundCheck,
        label: "Clientes activos",
        tone: "text-emerald-700",
        value: String(activeClients.count ?? 0),
      },
      {
        detail: "Proximos 7 dias",
        href: "/pagos",
        icon: Clock3,
        label: "Pagos por vencer",
        tone: "text-amber-700",
        value: String(upcomingCount),
      },
      {
        detail: formatMoney(overdueTotal),
        href: "/pagos?status=overdue",
        icon: AlertTriangle,
        label: "Pagos vencidos",
        tone: "text-rose-700",
        value: String(overdueCount),
      },
      {
        detail: `${reviewCount} pendientes de revisar`,
        href: "/documentos",
        icon: FileText,
        label: "Documentos cargados",
        tone: "text-cyan-700",
        value: String(totalDocuments.count ?? 0),
      },
    ],
    recentClients: ((clients.data ?? []) as unknown as DashboardClient[]).map(
      (client) => ({
        id: client.id,
        lastMove: `Actualizado el ${formatDate(client.updated_at.slice(0, 10))}`,
        name: client.display_name,
        owner:
          firstRelation(client.assignee)?.full_name ?? "Sin responsable",
        stage: clientStatus[client.status] ?? "Prospecto",
      }),
    ),
    reminders: [
      {
        detail: `${upcomingCount} pagos cumplen ventana de 7 dias`,
        href: "/pagos",
        icon: Mail,
        title: "Enviar avisos de pagos proximos",
      },
      {
        detail: `${overdueCount} pagos requieren seguimiento manual`,
        href: "/pagos?status=overdue",
        icon: AlertTriangle,
        title: "Revisar pagos vencidos",
      },
      {
        detail: `${reviewCount} archivos aun no tienen estado final`,
        href: "/documentos",
        icon: CheckCircle2,
        title: "Confirmar documentos",
      },
    ],
    upcomingPayments: ((payments.data ?? []) as DashboardPayment[]).map(
      (payment) => {
        const status =
          paymentStatus[payment.status] ?? paymentStatus.pending;

        return {
          amount: formatMoney(payment.amount, payment.currency ?? "MXN"),
          client: payment.clients?.display_name ?? "Sin cliente",
          contact: payment.clients?.primary_email ?? "Sin contacto principal",
          dueDate: formatDate(payment.due_date),
          id: payment.id,
          status: status.label,
          statusClass: status.statusClass,
        };
      },
    ),
  };
}
