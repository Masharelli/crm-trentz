"use client";

import { useEffect } from "react";
import { marcarLeida } from "./actions";

// Limpia el contador de no leidos al abrir la conversacion.
export default function MarkAsRead({
  conversationId,
  unreadCount,
}: {
  conversationId: string;
  unreadCount: number;
}) {
  useEffect(() => {
    if (unreadCount > 0) {
      void marcarLeida(conversationId);
    }
  }, [conversationId, unreadCount]);

  return null;
}
