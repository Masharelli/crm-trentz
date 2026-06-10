"use client";

import {
  Calculator,
  ClipboardList,
  Files,
  Funnel,
  LayoutDashboard,
  ListChecks,
  Mail,
  Settings,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/clientes", icon: UsersRound, label: "Clientes" },
  { href: "/funnels", icon: Funnel, label: "Funnels" },
  { href: "/tareas", icon: ListChecks, label: "Tareas" },
  { href: "/formularios", icon: ClipboardList, label: "Formularios" },
  { href: "/pagos", icon: WalletCards, label: "Pagos" },
  { href: "/contabilidad", icon: Calculator, label: "Contabilidad" },
  { href: "/documentos", icon: Files, label: "Documentos" },
  { href: "/correos", icon: Mail, label: "Correos" },
  { href: "/ajustes", icon: Settings, label: "Ajustes" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 grid gap-1">
      {navigation.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            href={item.href}
            key={item.label}
            className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
              active
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
