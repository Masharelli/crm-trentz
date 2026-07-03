// Skeleton generico mientras carga cualquier vista del dashboard.
// El sidebar permanece visible; esto solo cubre el area de contenido.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando contenido">
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-44 animate-pulse rounded-md bg-zinc-100" />
            <div className="h-4 w-28 animate-pulse rounded-md bg-zinc-100" />
          </div>
          <div className="h-11 w-36 animate-pulse rounded-md bg-zinc-100" />
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="h-11 w-full animate-pulse rounded-md bg-zinc-100 sm:w-72" />
          <div className="h-11 w-full animate-pulse rounded-md bg-zinc-100 sm:w-44" />
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
            <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="flex items-center gap-4 px-5 py-4" key={i}>
                <div className="h-4 w-1/4 animate-pulse rounded bg-zinc-100" />
                <div className="h-4 w-1/5 animate-pulse rounded bg-zinc-100" />
                <div className="h-4 w-1/6 animate-pulse rounded bg-zinc-100" />
                <div className="ml-auto h-7 w-20 animate-pulse rounded-md bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
