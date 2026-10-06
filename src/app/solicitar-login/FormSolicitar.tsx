"use client";

import { useActionState } from "react";
import { solicitarAcesso, type SolicitarState } from "./actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function FormSolicitar() {
  const [state, formAction, pending] = useActionState<SolicitarState, FormData>(
    solicitarAcesso,
    {},
  );

  if (state.ok) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
        Pedido enviado. Quando o login estiver pronto, entre com o e-mail e a
        senha que a equipe passar.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      <Campo rotulo="Nome" htmlFor="nome">
        <input
          id="nome"
          name="nome"
          className={inputCls}
          required
          autoComplete="name"
        />
      </Campo>
      <Campo rotulo="E-mail" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          className={inputCls}
          required
          autoComplete="email"
        />
      </Campo>
      <Campo rotulo="Setor" htmlFor="setor">
        <input
          id="setor"
          name="setor"
          className={inputCls}
          placeholder="Ex.: Recepção, Governança…"
          required
        />
      </Campo>
      <Campo rotulo="Função" htmlFor="funcao">
        <input
          id="funcao"
          name="funcao"
          className={inputCls}
          placeholder="Ex.: Atendente, Encarregado…"
          required
        />
      </Campo>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar pedido"}
      </button>
    </form>
  );
}

function Campo({
  rotulo,
  htmlFor,
  children,
}: {
  rotulo: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="grid gap-1 text-left">
      <span className="text-sm font-medium text-slate-700">{rotulo}</span>
      {children}
    </label>
  );
}
