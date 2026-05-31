import { Download, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import DeleteDocumentoButton from "./DeleteDocumentoButton";
import DocumentosFilter from "./DocumentosFilter";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

const TYPE_LABELS: Record<string, string> = {
  contract: "Contrato",
  identification: "Identificacion",
  tax: "Fiscal",
  payment_receipt: "Recibo de pago",
  legal: "Legal",
  other: "Otro",
};

const TYPE_COLORS: Record<string, string> = {
  contract: "bg-blue-50 text-blue-800 ring-blue-200",
  identification: "bg-purple-50 text-purple-800 ring-purple-200",
  tax: "bg-amber-50 text-amber-800 ring-amber-200",
  payment_receipt: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  legal: "bg-rose-50 text-rose-800 ring-rose-200",
  other: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

type Props = {
  searchParams: Promise<{ type?: string; client_id?: string }>;
};

export default async function DocumentosPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { type, client_id } = await searchParams;

  let query = supabase
    .from("documents")
    .select(
      "id, file_name, file_path, file_size, document_type, created_at, clients(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (type && type !== "all") {
    query = query.eq("document_type", type);
  }

  if (client_id) {
    query = query.eq("client_id", client_id);
  }

  const { data: documents } = await query;
  const docs = documents ?? [];

  let signedUrls: Record<string, string> = {};
  if (docs.length > 0) {
    const { data: urls } = await supabase.storage
      .from("client-documents")
      .createSignedUrls(
        docs.map((d) => d.file_path),
        3600,
      );
    if (urls) {
      for (const u of urls) {
        if (u.signedUrl && u.path) signedUrls[u.path] = u.signedUrl;
      }
    }
  }

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Documentos
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {docs.length} registros
            </p>
          </div>
          <Link
            href="/documentos/nuevo"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Subir documento
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Suspense>
          <DocumentosFilter />
        </Suspense>

        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {docs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Archivo</th>
                    <th className="px-5 py-3 font-semibold">Tipo</th>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Peso</th>
                    <th className="px-5 py-3 font-semibold">Fecha</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {docs.map((doc) => {
                    const clientData = Array.isArray(doc.clients)
                      ? (doc.clients[0] as { display_name: string } | undefined)
                      : (doc.clients as { display_name: string } | null);
                    const clientName = clientData?.display_name ?? "—";
                    const signedUrl = signedUrls[doc.file_path];
                    const typeColor =
                      TYPE_COLORS[doc.document_type] ?? TYPE_COLORS.other;
                    const typeLabel =
                      TYPE_LABELS[doc.document_type] ?? doc.document_type;

                    return (
                      <tr key={doc.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <FileText
                              className="shrink-0 text-zinc-400"
                              size={16}
                            />
                            <span className="max-w-[240px] truncate font-medium text-zinc-950">
                              {doc.file_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${typeColor}`}
                          >
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {clientName}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {signedUrl ? (
                              <a
                                href={signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                                aria-label={`Descargar ${doc.file_name}`}
                              >
                                <Download size={15} />
                              </a>
                            ) : null}
                            <DeleteDocumentoButton
                              id={doc.id}
                              filePath={doc.file_path}
                              nombre={doc.file_name}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <FileText size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                {type && type !== "all"
                  ? "Sin resultados para este filtro"
                  : "Sin documentos registrados"}
              </p>
              <p className="text-sm text-zinc-500">
                {type && type !== "all"
                  ? "Intenta con otro tipo de documento."
                  : "Sube el primer documento para empezar."}
              </p>
              {!type || type === "all" ? (
                <Link
                  href="/documentos/nuevo"
                  className="mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Subir documento
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
