"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AppNotification } from "@/lib/notifications";
import NotificationsBell from "./NotificationsBell";
import SidebarNav from "./SidebarNav";

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
        T
      </div>
      <div>
        <p className="text-sm font-semibold">Trentz CRM</p>
        <p className="text-xs text-zinc-500">Operacion interna</p>
      </div>
    </div>
  );
}

function ActiveModulesCard() {
  return (
    <div className="mt-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-semibold">Modulos activos</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Dashboard, Clientes, Pagos, Contabilidad y Documentos disponibles.
      </p>
    </div>
  );
}

export default function Sidebar({
  notifications,
  notificationsCount,
}: {
  notifications: AppNotification[];
  notificationsCount: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Cerrar el drawer al navegar a otra ruta (patron recomendado por React:
  // ajustar estado durante el render en vez de en un efecto).
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Bloquear scroll del body y cerrar con Escape mientras el drawer esta abierto.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Barra superior solo en mobile */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <NotificationsBell
            items={notifications}
            count={notificationsCount}
            align="right"
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-md border border-zinc-200 text-zinc-600"
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="mobile-sidebar"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Overlay del drawer (mobile) */}
      <div
        className={`fixed inset-0 z-40 bg-zinc-950/40 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer deslizable (mobile) */}
      <aside
        id="mobile-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col bg-white px-4 py-5 shadow-xl transition-transform duration-200 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between gap-3 px-2">
          <Brand />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-9 place-items-center rounded-md border border-zinc-200 text-zinc-600"
            aria-label="Cerrar menu"
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>

        <ActiveModulesCard />
      </aside>

      {/* Sidebar fijo en desktop */}
      <aside className="hidden border-zinc-200 bg-white md:flex md:w-72 md:border-r">
        <div className="flex h-full w-full flex-col px-4 py-5">
          <div className="flex items-center justify-between gap-3 px-2">
            <Brand />
            <NotificationsBell
              items={notifications}
              count={notificationsCount}
              align="left"
            />
          </div>
          <SidebarNav />
          <ActiveModulesCard />
        </div>
      </aside>
    </>
  );
}
