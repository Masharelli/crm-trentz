import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Toast from "./components/Toast";
import SidebarNav from "./SidebarNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-zinc-200 bg-white md:w-72 md:border-b-0 md:border-r">
        <div className="flex h-full flex-col px-4 py-5">
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
                T
              </div>
              <div>
                <p className="text-sm font-semibold">Trentz CRM</p>
                <p className="text-xs text-zinc-500">Operacion interna</p>
              </div>
            </div>
            <button
              className="grid size-9 place-items-center rounded-md border border-zinc-200 text-zinc-600 md:hidden"
              aria-label="Abrir notificaciones"
            >
              <Bell size={17} />
            </button>
          </div>

          <SidebarNav />

          <div className="mt-auto hidden rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:block">
            <p className="text-sm font-semibold">Modulos activos</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Dashboard, Clientes, Pagos y Documentos disponibles.
            </p>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">{children}</section>

      <Suspense>
        <Toast />
      </Suspense>
    </div>
  );
}
