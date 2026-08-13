"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { login, type LoginState } from "./actions";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="senha" className="text-sm font-medium text-slate-700">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 pb-20">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-brand-700"
          >
            ← Manutenção Vivaz
          </Link>
          <h1 className="mt-2 text-xl font-bold">Entrar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acesso da equipe de manutenção
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-slate-50/95 px-4 py-3 text-center text-xs text-slate-500 backdrop-blur-sm">
        © 2026 Vivaz Cataratas Resort • Dev by{" "}
        <a
          href="https://pedroriquelme.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-700 hover:underline"
        >
          Pedro Riquelme
        </a>
      </footer>
    </main>
  );
}
