"use client";

import { useState } from "react";

export function TesteObservabilidade() {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function disparar() {
    setEnviando(true);
    setMensagem(null);
    try {
      const { default: posthog } = await import("posthog-js");
      if (posthog.__loaded) posthog.capture("erro_teste_chamados");
      if (process.env.NODE_ENV === "production") {
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureException(
          new Error("Erro de teste do sistema de chamados"),
        );
        setMensagem(
          posthog.__loaded
            ? "Erro enviado ao Sentry. A sessão segue no PostHog."
            : "Erro enviado ao Sentry. A sessão do PostHog depende da chave configurada.",
        );
        return;
      }
      setMensagem(
        posthog.__loaded
          ? "Neste modo o Sentry não envia, para não quebrar a navegação. O PostHog registrou o evento de teste."
          : "Neste modo o Sentry não envia, para não quebrar a navegação. Configure a chave do PostHog para gravar a sessão.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-800">
        Teste de Sentry e PostHog
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Envia um erro de teste deste sistema, com a tag chamados. O chamado
        automático só abre depois que o webhook estiver configurado.
      </p>
      <button
        type="button"
        onClick={() => void disparar()}
        disabled={enviando}
        className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Disparar erro de teste"}
      </button>
      {mensagem && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {mensagem}
        </p>
      )}
    </div>
  );
}
