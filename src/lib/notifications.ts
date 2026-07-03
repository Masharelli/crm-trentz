import type { SupabaseClient } from "@supabase/supabase-js";

// Centro de notificaciones: se derivan en vivo de los datos existentes
// (tareas, pagos, formularios). No hay tabla propia ni estado "leido":
// el badge refleja el trabajo accionable pendiente y se vacia solo cuando
// los items se resuelven.

export type NotificationType = "task" | "payment" | "form" | "whatsapp";
export type NotificationSeverity = "danger" | "warning" | "info";

export type AppNotification = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  description: string;
  href: string;
  date: string; // ISO, para ordenar y mostrar tiempo relativo
};

export type NotificationsResult = {
  items: AppNotification[];
  count: number; // badge: solo items accionables (danger/warning)
};

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Las uniones a-uno de Supabase pueden venir como objeto o arreglo segun
// el inferidor de tipos; normalizamos para leer display_name/title.
function readField(joined: unknown, field: string): string | null {
  const row = Array.isArray(joined) ? joined[0] : joined;
  if (row && typeof row === "object" && field in row) {
    const value = (row as Record<string, unknown>)[field];
    return typeof value === "string" ? value : null;
  }
  return null;
}

const SEVERITY_RANK: Record<NotificationSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

export async function getNotifications(
  supabase: SupabaseClient,
): Promise<NotificationsResult> {
  const now = new Date();
  const today = dateOnly(now);
  const inSevenDays = dateOnly(new Date(now.getTime() + 7 * 86400000));
  const lastSevenDays = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [overdueTasks, duePayments, recentForms, unreadChats] =
    await Promise.all([
    supabase
      .from("client_tasks")
      .select("id, name, due_date, client_id, clients(display_name)")
      .is("completed_at", null)
      .not("due_date", "is", null)
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(25),
    supabase
      .from("payments")
      .select("id, concept, due_date, status, clients(display_name)")
      .in("status", ["pending", "scheduled", "overdue"])
      .lte("due_date", inSevenDays)
      .order("due_date", { ascending: true })
      .limit(25),
    supabase
      .from("form_assignments")
      .select("id, completed_at, clients(display_name), forms(title)")
      .eq("status", "completed")
      .gte("completed_at", lastSevenDays)
      .order("completed_at", { ascending: false })
      .limit(15),
    supabase
      .from("whatsapp_conversations")
      .select(
        "id, profile_name, phone_display, unread_count, last_message_at, last_message_preview, clients(display_name)",
      )
      .gt("unread_count", 0)
      .order("last_message_at", { ascending: false })
      .limit(10),
  ]);

  const items: AppNotification[] = [];

  for (const task of overdueTasks.data ?? []) {
    const cliente = readField(task.clients, "display_name") ?? "Cliente";
    items.push({
      id: `task-${task.id}`,
      type: "task",
      severity: "danger",
      title: "Tarea vencida",
      description: `${task.name} — ${cliente}`,
      href: `/clientes/${task.client_id}`,
      date: `${task.due_date}T00:00:00.000Z`,
    });
  }

  for (const payment of duePayments.data ?? []) {
    const cliente = readField(payment.clients, "display_name") ?? "Cliente";
    const vencido = String(payment.due_date) < today;
    items.push({
      id: `payment-${payment.id}`,
      type: "payment",
      severity: vencido ? "danger" : "warning",
      title: vencido ? "Pago vencido" : "Pago por vencer",
      description: `${payment.concept} — ${cliente}`,
      href: `/pagos/${payment.id}`,
      date: `${payment.due_date}T00:00:00.000Z`,
    });
  }

  for (const form of recentForms.data ?? []) {
    const cliente = readField(form.clients, "display_name") ?? "Cliente";
    const titulo = readField(form.forms, "title") ?? "Formulario";
    items.push({
      id: `form-${form.id}`,
      type: "form",
      severity: "info",
      title: "Formulario completado",
      description: `${titulo} — ${cliente}`,
      href: `/formularios/respuestas/${form.id}`,
      date: String(form.completed_at),
    });
  }

  for (const chat of unreadChats.data ?? []) {
    const nombre =
      readField(chat.clients, "display_name") ??
      chat.profile_name ??
      chat.phone_display;
    items.push({
      id: `whatsapp-${chat.id}`,
      type: "whatsapp",
      severity: "warning",
      title:
        chat.unread_count > 1
          ? `${chat.unread_count} mensajes de WhatsApp sin leer`
          : "Mensaje de WhatsApp sin leer",
      description: `${chat.last_message_preview ?? "Nuevo mensaje"} — ${nombre}`,
      href: `/whatsapp?c=${chat.id}`,
      date: chat.last_message_at ?? new Date().toISOString(),
    });
  }

  items.sort((a, b) => {
    if (SEVERITY_RANK[a.severity] !== SEVERITY_RANK[b.severity]) {
      return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    }
    // Informativos: mas recientes primero. Accionables: mas urgentes (fecha mas antigua) primero.
    return a.severity === "info"
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date);
  });

  const count = items.filter((item) => item.severity !== "info").length;

  return { items, count };
}
