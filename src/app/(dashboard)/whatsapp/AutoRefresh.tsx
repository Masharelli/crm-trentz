"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Realtime actualiza la bandeja al llegar cambios. El intervalo lento queda
// como respaldo si una red corporativa bloquea WebSockets.
export default function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimeout = useRef<number | null>(null);

  useEffect(() => {
    function refreshSoon() {
      if (refreshTimeout.current !== null) return;
      refreshTimeout.current = window.setTimeout(() => {
        refreshTimeout.current = null;
        if (document.visibilityState === "visible") router.refresh();
      }, 250);
    }

    const channel = supabase
      .channel("whatsapp-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        refreshSoon,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_messages" },
        refreshSoon,
      )
      .subscribe();

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      if (refreshTimeout.current !== null) {
        window.clearTimeout(refreshTimeout.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [router, intervalMs, supabase]);

  return null;
}
