"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Mantiene el hilo con scroll al fondo al abrir y al llegar mensajes nuevos.
export default function ThreadScroller({
  messageCount,
  children,
}: {
  messageCount: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previousCount = useRef(messageCount);
  const nearBottom = useRef(true);
  const [newMessages, setNewMessages] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const added = Math.max(0, messageCount - previousCount.current);
    if (previousCount.current === messageCount || nearBottom.current) {
      el.scrollTop = el.scrollHeight;
      setNewMessages(0);
    } else if (added > 0) {
      setNewMessages((current) => current + added);
    }
    previousCount.current = messageCount;
  }, [messageCount]);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom.current) setNewMessages(0);
  }

  function scrollToBottom() {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    nearBottom.current = true;
    setNewMessages(0);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-4 sm:px-6"
      >
        {children}
      </div>
      {newMessages > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <button
            type="button"
            onClick={scrollToBottom}
            className="pressable pointer-events-auto inline-flex items-center gap-2 rounded-full bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
          >
            <ArrowDown size={14} />
            {newMessages === 1
              ? "1 mensaje nuevo"
              : `${newMessages} mensajes nuevos`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
