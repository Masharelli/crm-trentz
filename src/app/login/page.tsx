import { LockKeyhole, Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6f4] px-4 py-10 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
            T
          </div>
          <div>
            <p className="text-sm font-semibold">Trentz CRM</p>
            <p className="text-sm text-zinc-500">Acceso interno</p>
          </div>
        </div>

        <div className="mt-8">
          <h1 className="text-2xl font-semibold tracking-normal">
            Iniciar sesion
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Usa el correo y contrasena del usuario creado en Supabase Auth.
          </p>
        </div>

        {params.error ? (
          <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
            {params.error}
          </div>
        ) : null}

        <form action={signIn} className="mt-6 grid gap-4">
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

          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Contrasena
            <span className="flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-zinc-500">
              <LockKeyhole size={17} />
              <input
                autoComplete="current-password"
                className="w-full bg-transparent text-zinc-950 outline-none placeholder:text-zinc-400"
                name="password"
                placeholder="Tu contrasena"
                required
                type="password"
              />
            </span>
          </label>

          <button
            className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            type="submit"
          >
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
