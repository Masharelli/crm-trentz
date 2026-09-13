"use client";

import { useEffect } from "react";
import { marcarLeida } from "./actions";

// Limpia el contador de no leidos al abrir la conversacion.
export default function MarkAsRead({
  conversationId,
  unreadCount,
  seenThrough,
}: {
  conversationId: string;
  unreadCount: number;
  seenThrough: string | null;
}) {
  useEffect(() => {
    if (unreadCount > 0) {
      void marcarLeida(conversationId, seenThrough);
    }
  }, [conversationId, seenThrough, unreadCount]);

  return null;
}
