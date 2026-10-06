"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  chamadoAindaAberto,
  recursoChatAusente,
  validarFechamentoSolicitante,
} from "@/lib/chamado-chat";
import type { Enums } from "@/lib/database.types";

export function FecharChamadoTi({
  token,
  status,
}: {
  token: string;
  status: Enums<"demanda_status">;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [aberto, setAberto] = useState(false);
  const [resolvido, setResolvido] = useState<boolean | null>(null);
  const [descricao, setDescricao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!chamadoAindaAberto(status)) return null;

  async function enviar() {
    const falha = validarFechamentoSolicitante(resolvido, descricao, status);
    if (falha) {
      setErro(falha);
      return;
    }
    setErro(null);
    setOcupado(true);
    const { error } = await supabase.rpc("solicitante_fechar_chamado", {
      p_token: token,
      p_resolvido: resolvido === true,
      p_descricao: descricao.trim(),
    });
    setOcupado(false);
    if (error) {
      setErro(
        recursoChatAusente(error.message)
          ? "Rode o SQL do chat de TI no Supabase e tente de novo."
          : error.message,
      );
      return;
    }
    setOk(
      resolvido
        ? "Chamado marcado como concluído. Obrigado!"
        : "Registramos que ainda não foi resolvido. A equipe de TI vê a mensagem.",
    );
    router.refresh();
  }

  if (ok) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-800">{ok}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
      <h2 className="text-base font-bold text-sky-900">Encerrar chamado</h2>
      <p className="mt-1 text-sm text-sky-800">
        Se o problema já foi resolvido, marque como concluído. Se não, explique o
        que ainda falta.
      </p>

      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-4 w-full cursor-pointer rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Marcar como concluído
        </button>
      ) : (
        <div className="mt-4 grid gap-3">
          <p className="text-sm font-semibold text-sky-900">Foi resolvido?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setResolvido(true)}
              className={`cursor-pointer rounded-xl border px-3 py-3 text-sm font-bold ${
                resolvido === true
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setResolvido(false)}
              className={`cursor-pointer rounded-xl border px-3 py-3 text-sm font-bold ${
                resolvido === false
                  ? "border-amber-500 bg-amber-500 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              Não
            </button>
          </div>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-sky-900">
              Descrição <span className="text-red-500">*</span>
            </span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={
                resolvido === false
                  ? "O que ainda não funciona?"
                  : "Como ficou a solução?"
              }
              className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
          </label>

          <button
            type="button"
            onClick={enviar}
            disabled={ocupado}
            className="cursor-pointer rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {ocupado ? "Enviando…" : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              setErro(null);
            }}
            className="cursor-pointer text-center text-sm text-sky-700"
          >
            Voltar
          </button>
        </div>
      )}

      {erro && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}
