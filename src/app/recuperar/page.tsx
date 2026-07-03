import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/auth-actions";

type Props = {
  searchParams: Promise<{ error?: string; sent?: string }>;
};

export default async function RecuperarPage({ searchParams }: Props) {
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6f4] px-4 py-10 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
            T
          </div>
          <div>
            <p className="text-sm font-semibold">Trentz CRM</p>
            <p className="text-sm text-zinc-500">Recuperar acceso</p>
          </div>
        </div>

        <div className="mt-8">
          <h1 className="text-2xl font-semibold tracking-normal">
            Recuperar contraseña
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Escribe tu correo y te enviaremos un enlace para restablecer tu
            contraseña.
          </p>
        </div>

        {sent ? (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            Si el correo está registrado, te enviamos un enlace para
            restablecer tu contraseña. Revisa tu bandeja (y la carpeta de spam).
          </div>
        ) : (
          <>
            {params.error ? (
              <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
                {params.error}
              </div>
            ) : null}

            <form action={requestPasswordReset} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Correo
                <span className="flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-zinc-500">
                  <Mail size={17} />
                  <input
                    autoComplete="email"
                    className="w-full bg-transparent text-zinc-950 outline-none placeholder:text-zinc-400"
                    name="email"
                    placeholder="tu-correo@trentz.mx"
                    required
                    type="email"
                  />
                </span>
              </label>

              <button
                className="mt-2 inline-flex whitespace-nowrap h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                type="submit"
              >
                Enviar enlace
              </button>
            </form>
          </>
        )}

        <Link
          href="/login"
          className="mt-6 inline-flex whitespace-nowrap items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          <ArrowLeft size={15} />
          Volver a iniciar sesión
        </Link>
      </section>
    </main>
  );
}
