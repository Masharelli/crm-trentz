import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  UserRoundCheck,
} from "lucide-react";

const paymentStatus = {
  canceled: {
    label: "Cancelado",
    statusClass: "bg-zinc-100 text-zinc-700 ring-zinc-200",
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
  id: string;
  status: keyof typeof documentStatus;
};

function getDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
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
  const today = getDateOnly(new Date());
  const nextSevenDays = getDateOnly(addDays(new Date(), 7));

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
      .in("status", ["pending", "scheduled"]),
    supabase
      .from("payments")
      .select("amount,currency", { count: "exact" })
      .or(`status.eq.overdue,due_date.lt.${today}`)
      .neq("status", "paid")
      .neq("status", "canceled"),
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
      .in("status", ["pending", "scheduled", "overdue"])
      .order("due_date", { ascending: true })
      .limit(4),
    supabase
      .from("clients")
      .select("id, display_name, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("documents")
      .select("id, file_name, document_type, status, clients(display_name)")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const overdueTotal = (overduePayments.data ?? []).reduce((sum, payment) => {
    return sum + Number(payment.amount ?? 0);
  }, 0);

  const overdueCount = overduePayments.count ?? 0;
  const reviewCount = documentsToReview.count ?? 0;
  const upcomingCount = upcomingPaymentsCount.count ?? 0;

  return {
    documentQueue: ((documents.data ?? []) as DashboardDocument[]).map(
      (document) => ({
        client: document.clients?.display_name ?? "Sin cliente",
        file: document.file_name,
        status: documentStatus[document.status] ?? "Subido",
        type: documentTypes[document.document_type] ?? "Otro",
      }),
    ),
    metrics: [
      {
        detail: "Registrados como activos",
        icon: UserRoundCheck,
        label: "Clientes activos",
        tone: "text-emerald-700",
        value: String(activeClients.count ?? 0),
      },
      {
        detail: "Proximos 7 dias",
        icon: Clock3,
        label: "Pagos por vencer",
        tone: "text-amber-700",
        value: String(upcomingCount),
      },
      {
        detail: formatMoney(overdueTotal),
        icon: AlertTriangle,
        label: "Pagos vencidos",
        tone: "text-rose-700",
        value: String(overdueCount),
      },
      {
        detail: `${reviewCount} pendientes de revisar`,
        icon: FileText,
        label: "Documentos cargados",
        tone: "text-cyan-700",
        value: String(totalDocuments.count ?? 0),
      },
    ],
    recentClients: ((clients.data ?? []) as DashboardClient[]).map((client) => ({
      lastMove: `Actualizado el ${formatDate(client.updated_at.slice(0, 10))}`,
      name: client.display_name,
      owner: "Sin responsable",
      stage: clientStatus[client.status] ?? "Prospecto",
    })),
    reminders: [
      {
        detail: `${upcomingCount} pagos cumplen ventana de 7 dias`,
        icon: Mail,
        title: "Enviar avisos de pagos proximos",
      },
      {
        detail: `${overdueCount} pagos requieren seguimiento manual`,
        icon: AlertTriangle,
        title: "Revisar pagos vencidos",
      },
      {
        detail: `${reviewCount} archivos aun no tienen estado final`,
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
          status: status.label,
          statusClass: status.statusClass,
        };
      },
    ),
  };
}
