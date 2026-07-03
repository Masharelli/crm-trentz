"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Refresca los server components periodicamente para traer mensajes nuevos.
// Solo cuando la pestana esta visible; Realtime queda como mejora futura.
export default function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
