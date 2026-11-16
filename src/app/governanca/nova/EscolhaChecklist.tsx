"use client";

import { useMemo, useState } from "react";
import {
  SEM_SETOR,
  agruparPorSetor,
  buscarPorSetor,
  chaveGrupo,
  passoEscolha,
  type PropriedadeRef,
  type SetorChecklist,
} from "@/lib/checklist-setores";
import { rotuloAplicacao, type Processo } from "@/lib/governanca";
import { GruposPorSetor } from "../GruposPorSetor";
import { Vazio, inputCls } from "../ui";

type ChecklistResumo = Processo & { itens: number };

/**
 * Escolha do checklist em passos: Propriedade → Setor → Checklist. Com a busca
 * preenchida, mostra direto todos os que combinam, agrupados.
 */
export function EscolhaChecklist<T extends ChecklistResumo>({
  processos,
  setores,
  propriedades,
  carregando,
  onEscolher,
  ondePorProcesso = {},
}: {
  /** Onde cada checklist se aplica (pela árvore de locais). */
  ondePorProcesso?: Record<string, string>;
  processos: T[];
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  carregando: boolean;
  onEscolher: (processo: T) => void;
}) {
  const [busca, setBusca] = useState("");
  const [propriedadeId, setPropriedadeId] = useState<string | null>(null);
  const [setorId, setSetorId] = useState<string | null>(null);

  const grupos = useMemo(() => agruparPorSetor(processos, setores, propriedades), [processos, setores, propriedades]);
  const achados = useMemo(
    () => (busca.trim() ? agruparPorSetor(buscarPorSetor(processos, busca, setores, propriedades), setores, propriedades) : null),
    [busca, processos, setores, propriedades],
  );
  const passo = passoEscolha(grupos, propriedadeId, setorId);

  const botaoChecklist = (p: T) => (
    <button
      key={p.id}
      type="button"
      disabled={carregando}
      onClick={() => onEscolher(p)}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-400"
    >
      <span className="text-xl">📋</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words font-semibold text-slate-800">{p.nome}</span>
        <span className="block break-words text-xs text-slate-500">
          {p.itens} itens · {ondePorProcesso[p.id] ?? rotuloAplicacao(p)}
          {p.descricao ? ` · ${p.descricao}` : ""}
        </span>
      </span>
    </button>
  );

  function voltar() {
    if (passo.etapa === "checklist" && passo.grupo.setores.length > 1) return setSetorId(null);
    setSetorId(null);
    setPropriedadeId(null);
  }
  const podeVoltar = passo.etapa === "setor" ? grupos.length > 1 : passo.etapa === "checklist" && (grupos.length > 1 || passo.grupo.setores.length > 1);

  return (
    <>
      <input
        className={`${inputCls} mb-4`}
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar checklist ou setor…"
      />

      {achados ? (
        achados.length ? (
          <GruposPorSetor grupos={achados} renderItem={botaoChecklist} />
        ) : (
          <Vazio texto="Nenhum checklist encontrado." />
        )
      ) : (
        <>
          {passo.etapa !== "propriedade" && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              {podeVoltar && (
                <button type="button" onClick={voltar} className="text-slate-500 hover:text-slate-800">
                  ←
                </button>
              )}
              <span className="font-semibold text-slate-700">
                {passo.grupo.propriedade?.nome ?? SEM_SETOR}
                {passo.etapa === "checklist" && passo.setor.setor ? ` · ${passo.setor.setor.nome}` : ""}
              </span>
            </div>
          )}

          {passo.etapa === "propriedade" && (
            <Opcoes
              opcoes={grupos.map((g) => ({
                chave: chaveGrupo(g.propriedade),
                nome: g.propriedade?.nome ?? SEM_SETOR,
                total: g.setores.reduce((n, s) => n + s.itens.length, 0),
              }))}
              onEscolher={setPropriedadeId}
            />
          )}
          {passo.etapa === "setor" && (
            <Opcoes
              opcoes={passo.grupo.setores.map((s) => ({
                chave: chaveGrupo(s.setor),
                nome: s.setor?.nome ?? SEM_SETOR,
                total: s.itens.length,
              }))}
              onEscolher={(chave) => {
                setPropriedadeId(chaveGrupo(passo.grupo.propriedade));
                setSetorId(chave);
              }}
            />
          )}
          {passo.etapa === "checklist" && <div className="space-y-2">{passo.setor.itens.map(botaoChecklist)}</div>}
        </>
      )}
    </>
  );
}

function Opcoes({
  opcoes,
  onEscolher,
}: {
  opcoes: { chave: string; nome: string; total: number }[];
  onEscolher: (chave: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {opcoes.map((o) => (
        <button
          key={o.chave}
          type="button"
          onClick={() => onEscolher(o.chave)}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400"
        >
          <span className="text-base font-semibold text-slate-800">{o.nome}</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            {o.total} {o.total === 1 ? "checklist" : "checklists"}
          </span>
        </button>
      ))}
    </div>
  );
}
