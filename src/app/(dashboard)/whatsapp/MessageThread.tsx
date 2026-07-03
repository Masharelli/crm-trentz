import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import Composer from "./Composer";
import { type ConversationRow, conversationName } from "./ConversationList";
import LinkClientDialog from "./LinkClientDialog";
import MarkAsRead from "./MarkAsRead";
import ThreadScroller from "./ThreadScroller";

export type MessageRow = {
  id: string;
  wamid: string | null;
  direction: "inbound" | "outbound";
  source: "api" | "phone" | "history";
  type: string;
  body: string | null;
  media_path: string | null;
  media_mime_type: string | null;
  status: string | null;
  error_message: string | null;
  wa_timestamp: string;
  sent_by: string | null;
  mediaUrl?: string | null;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function StatusTicks({ message }: { message: MessageRow }) {
  if (message.status === "failed") {
    return <AlertCircle size={14} className="text-rose-300" />;
  }
  if (message.status === "read") {
    return <CheckCheck size={14} className="text-sky-300" />;
  }
  if (message.status === "delivered") {
    return <CheckCheck size={14} className="text-emerald-100" />;
  }
  return <Check size={14} className="text-emerald-100" />;
}

function MediaContent({ message }: { message: MessageRow }) {
  if (!message.mediaUrl) return null;

  const mime = message.media_mime_type ?? "";

  if (mime.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={message.mediaUrl}
        alt={message.body ?? "Imagen"}
        className="mb-1 max-h-72 w-full rounded-lg object-cover"
      />
    );
  }

  if (mime.startsWith("audio/")) {
    return (
      // biome-ignore lint/a11y/useMediaCaption: audio de WhatsApp sin subtitulos
      <audio controls src={message.mediaUrl} className="mb-1 max-w-full" />
    );
  }

  if (mime.startsWith("video/")) {
    return (
      // biome-ignore lint/a11y/useMediaCaption: video de WhatsApp sin subtitulos
      <video
        controls
        src={message.mediaUrl}
        className="mb-1 max-h-72 w-full rounded-lg"
      />
    );
  }

  return (
    <a
      href={message.mediaUrl}
      target="_blank"
      rel="noreferrer"
      className="mb-1 inline-flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-xs font-medium underline-offset-2 hover:underline"
    >
      <FileText size={14} />
      {message.body ?? "Documento"}
    </a>
  );
}

export default function MessageThread({
  conversation,
  messages,
  windowOpen,
  lastInboundAt,
  escribir,
  clientes,
}: {
  conversation: ConversationRow;
  messages: MessageRow[];
  windowOpen: boolean;
  lastInboundAt: string | null;
  escribir: boolean;
  clientes: Array<{ id: string; display_name: string }>;
}) {
  const name = conversationName(conversation);

  let lastDay = "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MarkAsRead
        conversationId={conversation.id}
        unreadCount={conversation.unread_count}
      />

      <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 sm:px-6">
        <Link
          href="/whatsapp"
          className="grid size-9 shrink-0 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-100 md:hidden"
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-950">{name}</p>
          <p className="truncate text-xs text-zinc-500">
            {conversation.phone_display}
          </p>
        </div>

        {conversation.client_id ? (
          <Link
            href={`/clientes/${conversation.client_id}`}
            className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Ver cliente
          </Link>
        ) : escribir ? (
          <LinkClientDialog
            conversationId={conversation.id}
            profileName={conversation.profile_name}
            clientes={clientes}
          />
        ) : null}
      </div>

      <ThreadScroller messageCount={messages.length}>
        <div className="flex flex-col gap-1.5">
          {messages.map((message) => {
            const day = formatDay(message.wa_timestamp);
            const showSeparator = day !== lastDay;
            lastDay = day;

            const outbound = message.direction === "outbound";

            return (
              <div key={message.id} className="flex flex-col">
                {showSeparator ? (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
                      {day}
                    </span>
                  </div>
                ) : null}

                <div
                  className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2 text-sm sm:max-w-[70%] ${
                      outbound
                        ? "rounded-2xl rounded-br-sm bg-emerald-600 text-white"
                        : "rounded-2xl rounded-bl-sm bg-zinc-100 text-zinc-900"
                    }`}
                  >
                    <MediaContent message={message} />
                    {/* Con media visible se omite el placeholder tipo "[Imagen]",
                        pero se conserva el caption real. */}
                    {message.body &&
                    !(message.mediaUrl && message.body.startsWith("[")) &&
                    !(message.mediaUrl && message.type === "document") ? (
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                    ) : null}

                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        outbound ? "text-emerald-100" : "text-zinc-400"
                      }`}
                    >
                      {message.status === "failed" && message.error_message ? (
                        <span className="text-rose-200">
                          {message.error_message}
                        </span>
                      ) : null}
                      {outbound && message.source === "phone" ? (
                        <Smartphone size={12} />
                      ) : null}
                      <span>{formatTime(message.wa_timestamp)}</span>
                      {outbound ? <StatusTicks message={message} /> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ThreadScroller>

      {escribir ? (
        <Composer
          conversationId={conversation.id}
          windowOpen={windowOpen}
          lastInboundAt={lastInboundAt}
        />
      ) : null}
    </div>
  );
}
