"use client";

import { useState } from "react";
import {
  COMPLEMENTOS,
  lerExige,
  respostasPossiveis,
  rotuloResposta,
  type Complemento,
  type Dependencia,
  type Exige,
} from "@/lib/checklist-regras";
import { inputCls } from "../../../ui";

/** Alvo de uma condicional: outra pergunta ou uma seção inteira do mesmo checklist. */
export type AlvoCondicional = { tipo: "pergunta" | "secao"; id: string; rotulo: string };

const rotuloCampo = "mb-1 block text-xs font-medium text-slate-600";

/** Por resposta, o que vira obrigatório (comentário e/ou foto). */
export function ExigenciasPorResposta({
  tipo,
  opcoes,
  exige,
  onSalvar,
}: {
  tipo: string;
  opcoes: string[];
  exige: unknown;
  onSalvar: (exige: Exige) => void;
}) {
  const respostas = respostasPossiveis(tipo, opcoes);
  if (respostas.length === 0) return null;
  const atual = lerExige(exige);

  function alternar(resposta: string, c: Complemento) {
    const lista = atual[resposta] ?? [];
    const proxima = lista.includes(c) ? lista.filter((x) => x !== c) : [...lista, c];
    const resto: Exige = Object.fromEntries(Object.entries(atual).filter(([chave]) => chave !== resposta));
    onSalvar(proxima.length ? { ...resto, [resposta]: proxima } : resto);
  }

  return (
    <div className="sm:col-span-2">
      <span className={rotuloCampo}>Obrigatório quando a resposta for…</span>
      <div className="space-y-1">
        {respostas.map((r) => (
          <div key={r} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
            <span className="w-32 truncate font-medium" title={rotuloResposta(r)}>
              {rotuloResposta(r)}
            </span>
            {COMPLEMENTOS.map((c) => (
              <label key={c.valor} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={(atual[r] ?? []).includes(c.valor)}
                  onChange={() => alternar(r, c.valor)}
                />
                {c.rotulo}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Condicionais da pergunta: "se responder X, mostrar Y". */
export function Condicionais({
  tipo,
  opcoes,
  dependencias,
  alvos,
  onAdicionar,
  onRemover,
}: {
  tipo: string;
  opcoes: string[];
  dependencias: Dependencia[];
  alvos: AlvoCondicional[];
  onAdicionar: (gatilho: string, alvo: AlvoCondicional) => void;
  onRemover: (dependencia: Dependencia) => void;
}) {
  const respostas = respostasPossiveis(tipo, opcoes);
  const [gatilho, setGatilho] = useState("");
  const [alvoChave, setAlvoChave] = useState("");
  if (respostas.length === 0) return null;

  const chave = (a: { tipo: string; id: string }) => `${a.tipo}:${a.id}`;
  const nomeDoAlvo = (d: Dependencia) =>
    alvos.find((a) => a.id === (d.filho_pergunta_id ?? d.filho_secao_id))?.rotulo ?? "(removido)";

  return (
    <div className="sm:col-span-2">
      <span className={rotuloCampo}>Condicionais (o alvo só aparece com esta resposta)</span>
      {dependencias.length > 0 && (
        <ul className="mb-2 space-y-1 text-sm text-slate-700">
          {dependencias.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">
                Se <b>{rotuloResposta(d.gatilho)}</b> → mostra {nomeDoAlvo(d)}
              </span>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-red-600"
                onClick={() => onRemover(d)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
        <select className={inputCls} value={gatilho} onChange={(e) => setGatilho(e.target.value)} aria-label="Resposta">
          <option value="">Se responder…</option>
          {respostas.map((r) => (
            <option key={r} value={r}>
              {rotuloResposta(r)}
            </option>
          ))}
        </select>
        <select className={inputCls} value={alvoChave} onChange={(e) => setAlvoChave(e.target.value)} aria-label="Mostrar">
          <option value="">…mostrar</option>
          {alvos.map((a) => (
            <option key={chave(a)} value={chave(a)}>
              {a.tipo === "secao" ? "Seção: " : "Pergunta: "}
              {a.rotulo}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          disabled={!gatilho || !alvoChave}
          onClick={() => {
            const alvo = alvos.find((a) => chave(a) === alvoChave);
            if (!alvo) return;
            onAdicionar(gatilho, alvo);
            setGatilho("");
            setAlvoChave("");
          }}
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
}
