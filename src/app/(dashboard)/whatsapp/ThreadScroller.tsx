"use client";

import { useEffect, useRef } from "react";

// Mantiene el hilo con scroll al fondo al abrir y al llegar mensajes nuevos.
export default function ThreadScroller({
  messageCount,
  children,
}: {
  messageCount: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount]);

  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      {children}
    </div>
  );
}
