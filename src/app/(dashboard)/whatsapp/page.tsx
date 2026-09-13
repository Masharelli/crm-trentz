import { AlertCircle, MessageCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { canWrite, getCurrentRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import {
  listApprovedTemplates,
  type WhatsAppTemplate,
} from "@/lib/whatsapp/client";
import AutoRefresh from "./AutoRefresh";
import ConversationList, {
  type ConversationFilter,
  type ConversationRow,
} from "./ConversationList";
import MessageThread, { type MessageRow } from "./MessageThread";

type Props = {
  searchParams: Promise<{
    c?: string;
    q?: string;
    filter?: string;
    page?: string;
    messages?: string;
    error?: string;
  }>;
};

const CONVERSATIONS_PAGE_SIZE = 50;
const MESSAGES_PAGE_SIZE = 200;

function positiveInt(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function WhatsAppPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);

  const params = await searchParams;
  const { c: selectedId, q, error } = params;
  const filter: ConversationFilter =
    params.filter === "unread" ||
    params.filter === "unlinked" ||
    params.filter === "mine" ||
    params.filter === "resolved"
      ? params.filter
      : "all";
  const currentPage = positiveInt(params.page);
  const messagePages = Math.min(5, positiveInt(params.messages));
  const conversationSelect =
    "id, wa_id, phone_display, profile_name, client_id, unread_count, last_message_at, last_message_preview, inbox_status, assigned_to, clients(display_name), assignee:profiles!whatsapp_conversations_assigned_to_fkey(full_name)";

  let conversationsQuery = supabase
    .from("whatsapp_conversations")
    .select(conversationSelect, { count: "exact" })
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (q) {
    const term = q.replace(/[^\p{L}\p{N}\s+_-]/gu, "").trim();
    if (term) {
      conversationsQuery = conversationsQuery.or(
        `profile_name.ilike.%${term}%,phone_display.ilike.%${term}%`,
      );
    }
  }

  if (filter === "unread") {
    conversationsQuery = conversationsQuery.gt("unread_count", 0);
  } else if (filter === "unlinked") {
    conversationsQuery = conversationsQuery.is("client_id", null);
  } else if (filter === "mine") {
    conversationsQuery = conversationsQuery.eq("assigned_to", user.id);
  } else if (filter === "resolved") {
    conversationsQuery = conversationsQuery.eq("inbox_status", "resolved");
  } else {
    conversationsQuery = conversationsQuery.eq("inbox_status", "open");
  }

  const from = (currentPage - 1) * CONVERSATIONS_PAGE_SIZE;
  conversationsQuery = conversationsQuery.range(
    from,
    from + CONVERSATIONS_PAGE_SIZE - 1,
  );

  const { data: conversationsData, count, error: conversationsError } =
    await conversationsQuery;
  const conversations = (conversationsData ?? []) as unknown as ConversationRow[];

  let selected = selectedId
    ? (conversations.find((conv) => conv.id === selectedId) ?? null)
    : null;

  // Un enlace directo debe abrir el chat aunque no este en la pagina o filtro actual.
  if (selectedId && !selected) {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select(conversationSelect)
      .eq("id", selectedId)
      .maybeSingle();
    selected = data as unknown as ConversationRow | null;
  }

  let messages: MessageRow[] = [];
  let clientes: Array<{ id: string; display_name: string }> = [];
  let lastInboundAt: string | null = null;
  let totalMessages = 0;
  let templates: WhatsAppTemplate[] = [];
  let team: Array<{ id: string; full_name: string }> = [];

  if (selected) {
    const [messagesRes, conversationRes] = await Promise.all([
      supabase
        .from("whatsapp_messages")
        .select(
          "id, wamid, direction, source, type, body, media_path, media_mime_type, status, error_message, wa_timestamp, sent_by, profiles(full_name)",
          { count: "exact" },
        )
        .eq("conversation_id", selected.id)
        .order("wa_timestamp", { ascending: false })
        .limit(MESSAGES_PAGE_SIZE * messagePages),
      supabase
        .from("whatsapp_conversations")
        .select("last_inbound_at")
        .eq("id", selected.id)
        .maybeSingle(),
    ]);

    messages = ((messagesRes.data ?? []) as unknown as MessageRow[]).reverse();
    totalMessages = messagesRes.count ?? messages.length;

    lastInboundAt = conversationRes.data?.last_inbound_at ?? null;

    // URLs firmadas para la media descargada (bucket privado).
    const mediaPaths = messages
      .map((m) => m.media_path)
      .filter((p): p is string => Boolean(p));

    if (mediaPaths.length > 0) {
      const { data: signed } = await supabase.storage
        .from("whatsapp-media")
        .createSignedUrls(mediaPaths, 3600);

      const byPath = new Map(
        (signed ?? [])
          .filter((s) => s.signedUrl && s.path)
          .map((s) => [s.path as string, s.signedUrl]),
      );
      for (const message of messages) {
        if (message.media_path) {
          message.mediaUrl = byPath.get(message.media_path) ?? null;
        }
      }
    }

    if (!selected.client_id && escribir) {
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, display_name")
        .order("display_name", { ascending: true })
        .limit(500);
      clientes = clientsData ?? [];
    }

    if (escribir) {
      const [approvedTemplates, teamResult] = await Promise.all([
        listApprovedTemplates(),
        supabase
          .from("profiles")
          .select("id, full_name")
          .eq("is_active", true)
          .order("full_name", { ascending: true }),
      ]);
      templates = approvedTemplates;
      team = teamResult.data ?? [];
    }
  }

  return (
    <>
      <AutoRefresh intervalMs={30000} />

      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              WhatsApp
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {count ?? 0} conversaciones
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {error || conversationsError ? (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">No se pudo completar la accion</p>
              <p className="mt-0.5">
                {error ??
                  "No pudimos cargar las conversaciones. Recarga la pagina para intentar de nuevo."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex h-[calc(100dvh-200px)] min-h-[420px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {conversations.length > 0 || selected ? (
            <>
              <div
                className={`w-full flex-col md:flex md:w-[22rem] md:shrink-0 md:border-r md:border-zinc-200 xl:w-96 ${
                  selected ? "hidden" : "flex"
                }`}
              >
                <ConversationList
                  conversations={conversations}
                  selectedId={selected?.id ?? null}
                  q={q}
                  filter={filter}
                  page={currentPage}
                  total={count ?? 0}
                  pageSize={CONVERSATIONS_PAGE_SIZE}
                />
              </div>

              <div
                className={`min-w-0 flex-1 flex-col md:flex ${
                  selected ? "flex" : "hidden"
                }`}
              >
                {selected ? (
                  <MessageThread
                    conversation={selected}
                    messages={messages}
                    lastInboundAt={lastInboundAt}
                    escribir={escribir}
                    clientes={clientes}
                    totalMessages={totalMessages}
                    messagePages={messagePages}
                    listState={{ q, filter, page: currentPage }}
                    templates={templates}
                    team={team}
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
                    <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                      <MessageCircle size={22} />
                    </div>
                    <p className="text-sm font-medium text-zinc-700">
                      Selecciona una conversacion
                    </p>
                    <p className="text-sm text-zinc-500">
                      Elige un chat de la lista para ver los mensajes.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <MessageCircle size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                {q ? "Sin resultados para esta busqueda" : "Sin conversaciones"}
              </p>
              <p className="text-sm text-zinc-500">
                {q
                  ? "Intenta con otro nombre o numero."
                  : "Cuando alguien te escriba por WhatsApp, la conversacion aparecera aqui."}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
