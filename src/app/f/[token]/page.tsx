import { CheckCircle2, FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import { sortFields, type FormFieldDef } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicForm from "./PublicForm";

// Pagina publica: el cliente llega con la liga /f/<token>, sin sesion.
// El token es la autenticacion; los datos se leen con el service role.

export const metadata: Metadata = {
  title: "Formulario | Trentz",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  params: Promise<{ token: string }>;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {children}
        <p className="mt-8 text-center text-xs text-zinc-400">
          Trentz · Formulario seguro, solo accesible con esta liga.
        </p>
      </div>
    </div>
  );
}

function MensajeFinal({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
      {icon}
      <p className="text-lg font-semibold text-zinc-950">{title}</p>
      <p className="max-w-md text-sm text-zinc-500">{description}</p>
    </div>
  );
}

export default async function FormularioPublicoPage({ params }: Props) {
  const { token } = await params;

  if (!UUID_RE.test(token)) {
    return (
      <Shell>
        <MensajeFinal
          icon={
            <div className="grid size-14 place-items-center rounded-full bg-zinc-100 text-zinc-400">
              <FileQuestion size={28} />
            </div>
          }
          title="Liga no válida"
          description="Esta liga no existe o fue eliminada. Verifica que la copiaste completa o pide una nueva a tu contacto en Trentz."
        />
      </Shell>
    );
  }

  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("form_assignments")
    .select(
      "id, form_name, status, fields_snapshot, clients(display_name), form_answers(field_id, value)",
    )
    .eq("token", token)
    .maybeSingle();

  if (!assignment) {
    return (
      <Shell>
        <MensajeFinal
          icon={
            <div className="grid size-14 place-items-center rounded-full bg-zinc-100 text-zinc-400">
              <FileQuestion size={28} />
            </div>
          }
          title="Liga no válida"
          description="Esta liga no existe o fue eliminada. Verifica que la copiaste completa o pide una nueva a tu contacto en Trentz."
        />
      </Shell>
    );
  }

  if (assignment.status === "completed") {
    return (
      <Shell>
        <MensajeFinal
          icon={
            <div className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={28} />
            </div>
          }
          title="Este formulario ya fue enviado"
          description="Ya recibimos tus respuestas, ¡gracias! Si necesitas corregir algo, contacta a tu asesor en Trentz para que reabra la liga."
        />
      </Shell>
    );
  }

  const cliente = assignment.clients as unknown as {
    display_name: string;
  } | null;
  const fields = sortFields(
    (assignment.fields_snapshot ?? []) as FormFieldDef[],
  );
  const initialAnswers = Object.fromEntries(
    (assignment.form_answers as { field_id: string; value: string }[]).map(
      (a) => [a.field_id, a.value],
    ),
  );

  return (
    <Shell>
      <PublicForm
        token={token}
        formName={assignment.form_name}
        clientName={cliente?.display_name ?? null}
        fields={fields}
        initialAnswers={initialAnswers}
      />
    </Shell>
  );
}
