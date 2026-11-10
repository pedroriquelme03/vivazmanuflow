"use client";

import { useState } from "react";
import { FormAbrir, type FormAbrirProps } from "@/app/abrir/FormAbrir";
import { EscolherArea } from "@/components/EscolherArea";
import {
  AMBIENTES_CHAMADO,
  ROTULO_PAINEL,
  type AmbienteEquipe,
} from "@/lib/ambiente-equipe";
import { primeiroNome } from "@/lib/email-acesso";

export type OpcoesNovaDemanda = Omit<FormAbrirProps, "onSucesso">;

/**
 * "+ Novo chamado" começa como no solicitante: escolher TI ou Manutenção,
 * nada marcado. Fica na área do quadro só quando não faz sentido escolher:
 * "Registrar concluído" (trabalho da própria equipe) e chamado de projeto
 * (projetos são da Manutenção).
 */
export function precisaEscolherArea(opcoes: OpcoesNovaDemanda) {
  return !opcoes.destinarConcluido && opcoes.modoProjeto !== "obrigatorio";
}

export function NovaDemandaModal({
  opcoes,
  onFechar,
  onSucesso,
}: {
  opcoes: OpcoesNovaDemanda;
  onFechar: () => void;
  /** `ambiente`: área em que o chamado foi aberto (pode não ser a do quadro). */
  onSucesso: (token: string | null, ambiente: AmbienteEquipe) => void;
}) {
  const escolhe = precisaEscolherArea(opcoes);
  const [area, setArea] = useState<AmbienteEquipe | null>(
    escolhe ? null : (opcoes.ambiente ?? "manutencao"),
  );

  const titulo = opcoes.destinarConcluido
    ? "Registrar concluído"
    : area
      ? `Novo chamado de ${ROTULO_PAINEL[area]}`
      : "Novo chamado";
  const subtitulo = opcoes.destinarConcluido
    ? "Não entra na fila. Vai direto para Concluídas."
    : area
      ? `O chamado entra no quadro de ${ROTULO_PAINEL[area]} assim que for criado.`
      : "Escolha a equipe que vai atender.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="flex max-h-[min(88dvh,calc(100dvh-1.5rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {area === null ? (
            <EscolherArea
              nome={primeiroNome(opcoes.nomeSolicitantePadrao ?? "")}
              ambientes={AMBIENTES_CHAMADO}
              onEscolher={setArea}
              className="py-6"
            />
          ) : (
            <>
              {escolhe && (
                <button
                  type="button"
                  onClick={() => setArea(null)}
                  className="mb-3 cursor-pointer text-sm text-slate-400 transition hover:text-brand-700"
                >
                  ← Escolher outra área
                </button>
              )}
              <FormAbrir
                key={area}
                {...opcoes}
                ambiente={area}
                onSucesso={(token) => onSucesso(token, area)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
