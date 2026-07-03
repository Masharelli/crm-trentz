import { MessageCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { canWrite, getCurrentRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { WINDOW_MS } from "@/lib/whatsapp/phone";
import AutoRefresh from "./AutoRefresh";
import ConversationList, { type ConversationRow } from "./ConversationList";
import MessageThread, { type MessageRow } from "./MessageThread";

type Props = {
  searchParams: Promise<{ c?: string; q?: string }>;
};

export default async function WhatsAppPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);

  const { c: selectedId, q } = await searchParams;

  let conversationsQuery = supabase
    .from("whatsapp_conversations")
    .select(
      "id, wa_id, phone_display, profile_name, client_id, unread_count, last_message_at, last_message_preview, clients(display_name)",
      { count: "exact" },
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (q) {
    const term = q.replace(/[%,()]/g, "").trim();
    if (term) {
      conversationsQuery = conversationsQuery.or(
        `profile_name.ilike.%${term}%,phone_display.ilike.%${term}%`,
      );
    }
  }

  const { data: conversationsData, count } = await conversationsQuery;
  const conversations = (conversationsData ?? []) as unknown as ConversationRow[];

  const selected = selectedId
    ? (conversations.find((conv) => conv.id === selectedId) ?? null)
    : null;

  let messages: MessageRow[] = [];
  let clientes: Array<{ id: string; display_name: string }> = [];
  let windowOpen = false;
  let lastInboundAt: string | null = null;

  if (selected) {
    const [messagesRes, conversationRes] = await Promise.all([
      supabase
        .from("whatsapp_messages")
        .select(
          "id, wamid, direction, source, type, body, media_path, media_mime_type, status, error_message, wa_timestamp, sent_by",
        )
        .eq("conversation_id", selected.id)
        .order("wa_timestamp", { ascending: false })
        .limit(200),
      supabase
        .from("whatsapp_conversations")
        .select("last_inbound_at")
        .eq("id", selected.id)
        .maybeSingle(),
    ]);

    messages = ((messagesRes.data ?? []) as unknown as MessageRow[]).reverse();

    lastInboundAt = conversationRes.data?.last_inbound_at ?? null;
    windowOpen =
      lastInboundAt !== null &&
      Date.now() - new Date(lastInboundAt).getTime() < WINDOW_MS;

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
  }

  return (
    <>
      <AutoRefresh intervalMs={5000} />

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
        <div className="flex h-[calc(100dvh-200px)] min-h-[420px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {conversations.length > 0 ? (
            <>
              <div
                className={`w-full flex-col md:flex md:w-80 md:shrink-0 md:border-r md:border-zinc-200 ${
                  selected ? "hidden" : "flex"
                }`}
              >
                <ConversationList
                  conversations={conversations}
                  selectedId={selected?.id ?? null}
                  q={q}
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
                    windowOpen={windowOpen}
                    lastInboundAt={lastInboundAt}
                    escribir={escribir}
                    clientes={clientes}
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
