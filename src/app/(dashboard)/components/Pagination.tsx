import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

// Paginacion por links (server component): conserva los filtros activos
// via query params y solo agrega/quita `page`.

export const PAGE_SIZE = 50;

type Props = {
  page: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
  pageSize?: number;
};

export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export default function Pagination({
  page,
  total,
  basePath,
  params,
  pageSize = PAGE_SIZE,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function href(target: number) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") qs.set(key, value);
    }
    if (target > 1) qs.set("page", String(target));
    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  const navButton =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100";
  const navDisabled =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-100 bg-zinc-50 px-3 text-sm font-semibold text-zinc-300";

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-zinc-500">
        Mostrando {desde}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link className={navButton} href={href(page - 1)}>
            <ChevronLeft size={15} />
            Anterior
          </Link>
        ) : (
          <span className={navDisabled}>
            <ChevronLeft size={15} />
            Anterior
          </span>
        )}
        <span className="text-sm text-zinc-500">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link className={navButton} href={href(page + 1)}>
            Siguiente
            <ChevronRight size={15} />
          </Link>
        ) : (
          <span className={navDisabled}>
            Siguiente
            <ChevronRight size={15} />
          </span>
        )}
      </div>
    </div>
  );
}
