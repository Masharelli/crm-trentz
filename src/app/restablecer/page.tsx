import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { updatePassword } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RestablecerPage({ searchParams }: Props) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6f4] px-4 py-10 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
            T
          </div>
          <div>
            <p className="text-sm font-semibold">Trentz CRM</p>
            <p className="text-sm text-zinc-500">Nueva contraseña</p>
          </div>
        </div>

        {!user ? (
          <div className="mt-8">
            <h1 className="text-2xl font-semibold tracking-normal">
              Enlace no válido
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              El enlace expiró o ya fue usado. Solicita uno nuevo para
              restablecer tu contraseña.
            </p>
            <Link
              href="/recuperar"
              className="mt-6 inline-flex whitespace-nowrap h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <h1 className="text-2xl font-semibold tracking-normal">
                Define tu nueva contraseña
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Mínimo 8 caracteres. Después podrás iniciar sesión con ella.
              </p>
            </div>

            {params.error ? (
              <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
                {params.error}
              </div>
            ) : null}

            <form action={updatePassword} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Nueva contraseña
                <span className="flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-zinc-500">
                  <LockKeyhole size={17} />
                  <input
                    autoComplete="new-password"
                    className="w-full bg-transparent text-zinc-950 outline-none placeholder:text-zinc-400"
                    minLength={8}
                    name="password"
                    placeholder="Tu nueva contraseña"
                    required
                    type="password"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Confirmar contraseña
                <span className="flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-zinc-500">
                  <LockKeyhole size={17} />
                  <input
                    autoComplete="new-password"
                    className="w-full bg-transparent text-zinc-950 outline-none placeholder:text-zinc-400"
                    minLength={8}
                    name="confirm"
                    placeholder="Repite la contraseña"
                    required
                    type="password"
                  />
                </span>
              </label>

              <button
                className="mt-2 inline-flex whitespace-nowrap h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                type="submit"
              >
                Guardar contraseña
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
