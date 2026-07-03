"use client";

import {
  Bell,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  AppNotification,
  NotificationType,
} from "@/lib/notifications";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  task: ClipboardList,
  payment: WalletCards,
  form: CheckCircle2,
  whatsapp: MessageCircle,
};

const SEVERITY_DOT: Record<AppNotification["severity"], string> = {
  danger: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-emerald-500",
};

function timeAgo(iso: string): string {
  const diffDays = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "ayer";
  if (diffDays > 1) return `hace ${diffDays} días`;
  if (diffDays === -1) return "mañana";
  return `en ${Math.abs(diffDays)} días`;
}

export default function NotificationsBell({
  items,
  count,
  align = "right",
}: {
  items: AppNotification[];
  count: number;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-10 place-items-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
        aria-label="Notificaciones"
        aria-expanded={open}
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-950">Notificaciones</p>
            {count > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                {count} por atender
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
              <div className="grid size-11 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <Bell size={20} />
              </div>
              <p className="text-sm font-medium text-zinc-700">Todo al día</p>
              <p className="text-sm text-zinc-500">
                No tienes notificaciones pendientes.
              </p>
            </div>
          ) : (
            <ul className="max-h-[min(70vh,28rem)] divide-y divide-zinc-100 overflow-y-auto">
              {items.map((item) => {
                const Icon = TYPE_ICON[item.type];
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 transition hover:bg-zinc-50"
                    >
                      <span className="relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-600">
                        <Icon size={16} />
                        <span
                          className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-white ${
                            SEVERITY_DOT[item.severity]
                          }`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-zinc-950">
                          {item.title}
                        </span>
                        <span className="block truncate text-sm text-zinc-600">
                          {item.description}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-400">
                          {timeAgo(item.date)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
