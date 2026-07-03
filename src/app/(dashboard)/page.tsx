import {
  Building2,
  CalendarDays,
  ChevronRight,
  FileUp,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { getDashboardData } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, dashboardData] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,email,role,is_active")
      .eq("id", user.id)
      .maybeSingle(),
    getDashboardData(supabase),
  ]);

  const {
    documentQueue,
    metrics,
    recentClients,
    reminders,
    upcomingPayments,
  } = dashboardData;
  const displayName =
    profile?.full_name || profile?.email || user.email || "Usuario Trentz";

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              Sesion activa: {displayName}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Control de clientes y pagos
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <form action="/buscar" className="sm:w-72">
              <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-500">
                <Search size={17} />
                <input
                  className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400"
                  name="q"
                  placeholder="Buscar cliente, pago o documento"
                  type="search"
                />
              </label>
            </form>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link
                href="/clientes/nuevo"
                className="inline-flex h-11 whitespace-nowrap items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <Plus size={17} />
                Cliente
              </Link>
              <Link
                href="/documentos/nuevo"
                className="inline-flex h-11 whitespace-nowrap items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <Upload size={17} />
                Documento
              </Link>
              <form action={signOut} className="col-span-2 sm:col-span-1">
                <button
                  className="inline-flex h-11 whitespace-nowrap w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                  type="submit"
                >
                  <LogOut size={17} />
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {!profile?.is_active ? (
          <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Tu usuario inicio sesion, pero todavia no esta activo en
            `profiles`. Revisa en Supabase que exista tu perfil y que
            `is_active` sea verdadero.
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article
                className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5"
                key={metric.label}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-500">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-normal sm:mt-3 sm:text-3xl">
                      {metric.value}
                    </p>
                  </div>
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-md bg-zinc-100 sm:size-10 ${metric.tone}`}
                  >
                    <Icon size={19} />
                  </div>
                </div>
                <p className={`mt-3 text-xs font-medium sm:mt-4 sm:text-sm ${metric.tone}`}>
                  {metric.detail}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="min-w-0 rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Proximos pagos</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Pagos que requieren seguimiento esta semana.
                </p>
              </div>
              <button
                className="inline-flex h-10 whitespace-nowrap items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                type="button"
              >
                <CalendarDays size={17} />
                Ver calendario
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Contacto</th>
                    <th className="px-5 py-3 font-semibold">Vence</th>
                    <th className="px-5 py-3 font-semibold">Monto</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {upcomingPayments.length > 0 ? (
                    upcomingPayments.map((payment) => (
                      <tr key={`${payment.client}-${payment.dueDate}`}>
                        <td className="px-5 py-4 font-medium text-zinc-950">
                          {payment.client}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {payment.contact}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {payment.dueDate}
                        </td>
                        <td className="px-5 py-4 font-semibold">
                          {payment.amount}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${payment.statusClass}`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                            aria-label={`Abrir pago de ${payment.client}`}
                          >
                            <ChevronRight size={17} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-sm text-zinc-500"
                        colSpan={6}
                      >
                        Todavia no hay pagos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid min-w-0 gap-6">
            <section className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Clientes recientes</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Movimientos que conviene revisar.
                  </p>
                </div>
                <Building2 className="text-zinc-400" size={20} />
              </div>

              <div className="mt-5 grid gap-4">
                {recentClients.length > 0 ? (
                  recentClients.map((client) => (
                    <article
                      className="rounded-md border border-zinc-200 p-4"
                      key={client.name}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{client.name}</p>
                          <p className="mt-1 text-sm text-zinc-500">
                            Responsable: {client.owner}
                          </p>
                        </div>
                        <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                          {client.stage}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-zinc-600">
                        {client.lastMove}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                    Todavia no hay clientes registrados.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Recordatorios</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Tareas automaticas que despues enviaremos por correo.
                  </p>
                </div>
                <button
                  className="grid size-9 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                  aria-label="Opciones de recordatorios"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                {reminders.map((reminder) => {
                  const Icon = reminder.icon;

                  return (
                    <div
                      className="flex items-start gap-3 rounded-md bg-zinc-50 p-3"
                      key={reminder.title}
                    >
                      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-white text-zinc-700 ring-1 ring-zinc-200">
                        <Icon size={17} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{reminder.title}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {reminder.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Cola de documentos</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Archivos subidos por cliente antes de mandarlos a storage.
              </p>
            </div>
            <button className="inline-flex h-10 whitespace-nowrap items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
              <FileUp size={17} />
              Subir archivo
            </button>
          </div>

          <div className="grid divide-y divide-zinc-100">
            {documentQueue.length > 0 ? (
              documentQueue.map((document) => (
                <div
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_180px_120px_100px] sm:items-center"
                  key={document.file}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{document.file}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {document.client}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-600">{document.type}</p>
                  <p className="text-sm font-medium text-zinc-800">
                    {document.status}
                  </p>
                  <button className="inline-flex h-9 whitespace-nowrap items-center justify-center gap-2 rounded-md bg-zinc-100 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200">
                    Abrir
                  </button>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-zinc-500">
                Todavia no hay documentos cargados.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
