import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import BuscarConversacion from "./BuscarConversacion";

export type ConversationFilter =
  | "all"
  | "unread"
  | "unlinked"
  | "mine"
  | "resolved";

export type ConversationRow = {
  id: string;
  wa_id: string;
  phone_display: string;
  profile_name: string | null;
  client_id: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  inbox_status: "open" | "resolved";
  assigned_to: string | null;
  assignee: { full_name: string } | { full_name: string }[] | null;
  clients: { display_name: string } | { display_name: string }[] | null;
};

export function conversationName(conv: ConversationRow): string {
  const client = Array.isArray(conv.clients) ? conv.clients[0] : conv.clients;
  return client?.display_name ?? conv.profile_name ?? conv.phone_display;
}

function relativeTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(today.getTime() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export default function ConversationList({
  conversations,
  selectedId,
  q,
  filter,
  page,
  total,
  pageSize,
}: {
  conversations: ConversationRow[];
  selectedId: string | null;
  q?: string;
  filter: ConversationFilter;
  page: number;
  total: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function listHref(overrides: {
    filter?: ConversationFilter;
    page?: number;
    conversationId?: string;
  }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const nextFilter = overrides.filter ?? filter;
    if (nextFilter !== "all") params.set("filter", nextFilter);
    const nextPage = overrides.page ?? page;
    if (nextPage > 1) params.set("page", String(nextPage));
    if (overrides.conversationId) params.set("c", overrides.conversationId);
    const query = params.toString();
    return query ? `/whatsapp?${query}` : "/whatsapp";
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-2 border-b border-zinc-100 p-3">
        <BuscarConversacion initialValue={q ?? ""} filter={filter} />
        <div className="flex gap-1" aria-label="Filtrar conversaciones">
          {(
            [
              ["all", "Todas"],
              ["unread", "No leidas"],
              ["unlinked", "Sin vincular"],
              ["mine", "Mias"],
              ["resolved", "Resueltas"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={listHref({ filter: value, page: 1 })}
              aria-current={filter === value ? "page" : undefined}
              className={`pressable inline-flex h-8 items-center rounded-md px-2.5 text-xs font-semibold ${
                filter === value
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.map((conv) => {
          const name = conversationName(conv);
          const active = conv.id === selectedId;
          const sinVincular = !conv.client_id;

          return (
            <Link
              key={conv.id}
              href={listHref({ conversationId: conv.id })}
              className={`pressable flex items-center gap-3 border-b border-zinc-50 px-4 py-3 ${
                active ? "bg-zinc-100" : "hover:bg-zinc-50"
              }`}
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                {name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-zinc-950">
                    {name}
                  </p>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {relativeTime(conv.last_message_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-zinc-500">
                    {conv.last_message_preview ?? conv.phone_display}
                  </p>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {sinVincular ? (
                      <span className="inline-flex h-5 items-center whitespace-nowrap rounded-md bg-amber-50 px-1.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                        Sin vincular
                      </span>
                    ) : null}
                    {conv.unread_count > 0 ? (
                      <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
                        {conv.unread_count > 9 ? "9+" : conv.unread_count}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-3 py-2">
          {page > 1 ? (
            <Link
              href={listHref({ page: page - 1 })}
              className="pressable grid size-8 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
              aria-label="Pagina anterior"
            >
              <ChevronLeft size={16} />
            </Link>
          ) : (
            <span className="grid size-8 place-items-center text-zinc-300">
              <ChevronLeft size={16} />
            </span>
          )}
          <span className="text-xs font-medium text-zinc-500">
            {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={listHref({ page: page + 1 })}
              className="pressable grid size-8 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
              aria-label="Pagina siguiente"
            >
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span className="grid size-8 place-items-center text-zinc-300">
              <ChevronRight size={16} />
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
