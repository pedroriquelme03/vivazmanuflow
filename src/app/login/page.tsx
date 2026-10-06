"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { BrandMark } from "@/components/BrandMark";
import { CartaoEntrada } from "@/components/CartaoEntrada";
import { MolduraEntrada } from "@/components/MolduraEntrada";
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
    <MolduraEntrada>
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <CartaoEntrada className="max-w-sm p-8 sm:max-w-md sm:p-10 lg:max-w-lg lg:p-12">
          <div className="mb-6 text-center">
            <BrandMark className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30" />
            <h1 className="text-xl font-bold">Entrar</h1>
            <p className="mt-1 text-sm text-slate-500">
              Use o e-mail e a senha cadastrados pela equipe.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <Link
            href="/"
            className="mt-6 block text-center text-sm text-slate-400 transition hover:text-brand-700"
          >
            ← Voltar
          </Link>
        </CartaoEntrada>
      </main>
    </MolduraEntrada>
  );
}
