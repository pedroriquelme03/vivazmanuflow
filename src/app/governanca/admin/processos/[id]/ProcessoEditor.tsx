"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Dependencia } from "@/lib/checklist-regras";
import type { TablesUpdate } from "@/lib/database.types";
import {
  TIPOS_ITEM,
  TIPO_ITEM_LABEL,
  proximaOrdem,
  rotuloAplicacao,
  tipoItem,
  tipoTemOpcoes,
  type Pergunta,
  type Processo,
  type Secao,
  type SecaoComPerguntas,
  type TipoItem,
  type TipoProcesso,
} from "@/lib/governanca";
import { rotuloSetor, type PropriedadeRef, type SetorChecklist } from "@/lib/checklist-setores";
import { ativosOuAtual } from "@/lib/propriedade-opcoes";
import { SelectSetor } from "../../../Seletores";
import { Erro, btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../../ui";
import { useGravar } from "../../../useGravar";
import { CampoLocal } from "../CampoLocal";
import { Condicionais, ExigenciasPorResposta, type AlvoCondicional } from "./RegrasPergunta";

export function ProcessoEditor({
  processo,
  secoes,
  setores,
  propriedades,
  meusSetores,
  dependencias,
}: {
  processo: Processo;
  secoes: SecaoComPerguntas[];
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  /** Setores para onde a pessoa pode mover o checklist (admin: todos; líder: os dele). */
  meusSetores: SetorChecklist[];
  /** Condicionais das perguntas deste checklist. */
  dependencias: Dependencia[];
}) {
  const { supabase, erro, gravar } = useGravar();
  const [novaSecao, setNovaSecao] = useState("");
  const total = secoes.reduce((n, s) => n + s.gov_perguntas.length, 0);
  const alvos = useMemo<AlvoCondicional[]>(
    () =>
      secoes.flatMap((s) => [
        { tipo: "secao" as const, id: s.id, rotulo: s.nome },
        ...s.gov_perguntas.map((q) => ({ tipo: "pergunta" as const, id: q.id, rotulo: `${s.nome} › ${q.texto}` })),
      ]),
    [secoes],
  );

  function addSecao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaSecao.trim()) return;
    const nome = novaSecao.trim();
    setNovaSecao("");
    gravar(
      supabase
        .from("gov_secoes")
        .insert({ processo_id: processo.id, nome, ordem: proximaOrdem(secoes) }),
    );
  }

  function renomearSecao(s: Secao, nome: string) {
    if (!nome.trim() || nome.trim() === s.nome) return;
    gravar(supabase.from("gov_secoes").update({ nome: nome.trim() }).eq("id", s.id));
  }

  function removerSecao(s: Secao) {
    if (!confirm(`Remover a seção "${s.nome}" e todas as suas perguntas?`)) return;
    gravar(supabase.from("gov_secoes").delete().eq("id", s.id));
  }

  function moverSecao(idx: number, delta: -1 | 1) {
    const outra = secoes[idx + delta];
    const atual = secoes[idx];
    if (!outra) return;
    gravar(
      Promise.all([
        supabase.from("gov_secoes").update({ ordem: outra.ordem }).eq("id", atual.id),
        supabase.from("gov_secoes").update({ ordem: atual.ordem }).eq("id", outra.id),
      ]).then(([a, b]) => ({ error: a.error ?? b.error })),
    );
  }

  function addPergunta(secao: SecaoComPerguntas, texto: string) {
    if (!texto.trim()) return;
    const ultima = secao.gov_perguntas[secao.gov_perguntas.length - 1];
    gravar(
      supabase.from("gov_perguntas").insert({
        secao_id: secao.id,
        texto: texto.trim(),
        ordem: proximaOrdem(secao.gov_perguntas),
        grupo: ultima?.grupo ?? null,
      }),
    );
  }

  function atualizarPergunta(p: Pergunta, patch: TablesUpdate<"gov_perguntas">) {
    gravar(supabase.from("gov_perguntas").update(patch).eq("id", p.id));
  }

  function removerPergunta(p: Pergunta) {
    gravar(supabase.from("gov_perguntas").delete().eq("id", p.id));
  }

  return (
    <>
      <Link
        href="/governanca/admin/processos"
        className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800"
      >
        ← Gerenciar checklists
      </Link>

      <DadosProcesso
        processo={processo}
        total={total}
        setores={setores}
        propriedades={propriedades}
        meusSetores={meusSetores}
        onSalvar={(patch) => gravar(supabase.from("gov_processos").update(patch).eq("id", processo.id))}
      />

      <Erro texto={erro} />

      <div className="space-y-4">
        {secoes.map((s, idx) => (
          <div key={s.id} className={cardCls}>
            <div className="mb-3 flex items-center gap-2">
              <input
                key={`${s.id}-${s.nome}`}
                defaultValue={s.nome}
                onBlur={(e) => renomearSecao(s, e.target.value)}
                aria-label="Nome da seção"
                className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent text-lg font-bold outline-none focus:border-slate-300"
              />
              <span className="text-xs text-slate-400">{s.gov_perguntas.length} itens</span>
              <button
                type="button"
                onClick={() => moverSecao(idx, -1)}
                disabled={idx === 0}
                className="px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                aria-label="Subir seção"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moverSecao(idx, 1)}
                disabled={idx === secoes.length - 1}
                className="px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                aria-label="Descer seção"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removerSecao(s)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Remover
              </button>
            </div>

            <ul className="mb-3 divide-y divide-slate-100">
              {s.gov_perguntas.map((p, i) => (
                <ItemEditor
                  key={p.id}
                  numero={i + 1}
                  pergunta={p}
                  dependencias={dependencias.filter((d) => d.pergunta_id === p.id)}
                  alvos={alvos.filter((a) => a.id !== p.id && a.id !== s.id)}
                  onAtualizar={(patch) => atualizarPergunta(p, patch)}
                  onRemover={() => removerPergunta(p)}
                  onAdicionarCondicional={(gatilho, alvo) =>
                    gravar(
                      supabase.from("gov_dependencias").insert({
                        pergunta_id: p.id,
                        gatilho,
                        filho_pergunta_id: alvo.tipo === "pergunta" ? alvo.id : null,
                        filho_secao_id: alvo.tipo === "secao" ? alvo.id : null,
                      }),
                      { "23505": "Essa condicional já existe." },
                    )
                  }
                  onRemoverCondicional={(d) => gravar(supabase.from("gov_dependencias").delete().eq("id", d.id))}
                />
              ))}
              {s.gov_perguntas.length === 0 && (
                <li className="py-2 text-sm text-slate-500">Nenhuma pergunta nesta seção.</li>
              )}
            </ul>

            <NovaPergunta onAdd={(texto) => addPergunta(s, texto)} />
          </div>
        ))}
      </div>

      <form onSubmit={addSecao} className={`${cardCls} mt-4 flex flex-col gap-3 sm:flex-row sm:items-end`}>
        <label className="block flex-1">
          <span className={labelCls}>Nova seção</span>
          <input
            className={inputCls}
            value={novaSecao}
            onChange={(e) => setNovaSecao(e.target.value)}
            placeholder="Ex.: Acomodação, Banheiro, Casa de máquinas…"
          />
        </label>
        <button type="submit" className={btnPrimario}>
          + Adicionar seção
        </button>
      </form>
    </>
  );
}

function DadosProcesso({
  processo,
  total,
  setores,
  propriedades,
  meusSetores,
  onSalvar,
}: {
  processo: Processo;
  total: number;
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  meusSetores: SetorChecklist[];
  onSalvar: (patch: TablesUpdate<"gov_processos">) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(processo.nome);
  const [setorId, setSetorId] = useState(processo.setor_id);
  const [descricao, setDescricao] = useState(processo.descricao ?? "");
  const [usaAcomodacao, setUsaAcomodacao] = useState(processo.usa_acomodacao);
  const [tipo, setTipo] = useState<TipoProcesso>((processo.tipo as TipoProcesso) ?? "ambos");

  if (!editando) {
    return (
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {rotuloSetor(processo.setor_id, setores, propriedades)}
          </p>
          <h1 className="text-xl font-bold">{processo.nome}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {total} itens · {rotuloAplicacao(processo)}
            {processo.descricao ? ` · ${processo.descricao}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => setEditando(true)} className={`${btnSecundario} shrink-0 py-2`}>
          Editar dados
        </button>
      </div>
    );
  }

  return (
    <form
      className={`${cardCls} mb-5 space-y-3`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) return;
        onSalvar({
          nome: nome.trim(),
          setor_id: setorId,
          descricao: descricao.trim() || null,
          usa_acomodacao: usaAcomodacao,
          tipo: usaAcomodacao ? tipo : "ambos",
        });
        setEditando(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Nome</span>
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="block">
          <span className={labelCls}>Setor</span>
          <SelectSetor
            value={setorId}
            onChange={setSetorId}
            setores={ativosOuAtual(meusSetores, processo.setor_id)}
            propriedades={propriedades}
          />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Descrição</span>
        <input className={inputCls} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>
      <CampoLocal usaLocal={usaAcomodacao} onUsaLocal={setUsaAcomodacao} tipo={tipo} onTipo={setTipo} />
      <div className="flex gap-2">
        <button type="submit" className={btnPrimario}>
          Salvar
        </button>
        <button type="button" className={btnSecundario} onClick={() => setEditando(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ItemEditor({
  numero,
  pergunta: p,
  dependencias,
  alvos,
  onAtualizar,
  onRemover,
  onAdicionarCondicional,
  onRemoverCondicional,
}: {
  numero: number;
  pergunta: Pergunta;
  /** Condicionais em que esta pergunta é a que dispara. */
  dependencias: Dependencia[];
  /** Outras perguntas e seções do checklist que podem ser mostradas. */
  alvos: AlvoCondicional[];
  onAtualizar: (patch: TablesUpdate<"gov_perguntas">) => void;
  onRemover: () => void;
  onAdicionarCondicional: (gatilho: string, alvo: AlvoCondicional) => void;
  onRemoverCondicional: (dependencia: Dependencia) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const tipo = tipoItem(p.tipo);

  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-right text-xs text-slate-400">{numero}.</span>
        <input
          key={`${p.id}-${p.texto}`}
          defaultValue={p.texto}
          onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== p.texto && onAtualizar({ texto: e.target.value.trim() })}
          aria-label={`Pergunta ${numero}`}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          aria-expanded={aberto}
        >
          {TIPO_ITEM_LABEL[tipo].split(" (")[0]}
        </button>
        <button
          type="button"
          onClick={onRemover}
          className="shrink-0 text-slate-400 hover:text-red-600"
          aria-label="Remover pergunta"
        >
          ✕
        </button>
      </div>
      {p.grupo && !aberto && <p className="ml-8 mt-1 text-[11px] text-slate-400">{p.grupo}</p>}

      {aberto && (
        <div className="ml-8 mt-2 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Tipo de resposta</span>
            <select
              className={inputCls}
              value={tipo}
              onChange={(e) => onAtualizar({ tipo: e.target.value as TipoItem })}
            >
              {TIPOS_ITEM.map((t) => (
                <option key={t} value={t}>
                  {TIPO_ITEM_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Subárea (opcional)</span>
            <input
              key={`${p.id}-g-${p.grupo ?? ""}`}
              className={inputCls}
              defaultValue={p.grupo ?? ""}
              placeholder="Ex.: Bombas › Bomba 1"
              onBlur={(e) => (e.target.value.trim() || null) !== p.grupo && onAtualizar({ grupo: e.target.value.trim() || null })}
            />
          </label>
          {tipoTemOpcoes(tipo) && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">Opções (uma por linha)</span>
              <textarea
                key={`${p.id}-o-${p.opcoes.join("|")}`}
                className={inputCls}
                rows={Math.min(8, Math.max(3, p.opcoes.length))}
                defaultValue={p.opcoes.join("\n")}
                onBlur={(e) => {
                  const opcoes = e.target.value.split("\n").map((o) => o.trim()).filter(Boolean);
                  if (opcoes.join("|") !== p.opcoes.join("|")) onAtualizar({ opcoes });
                }}
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-600">Dica (opcional)</span>
            <input
              key={`${p.id}-d-${p.dica ?? ""}`}
              className={inputCls}
              defaultValue={p.dica ?? ""}
              onBlur={(e) => (e.target.value.trim() || null) !== p.dica && onAtualizar({ dica: e.target.value.trim() || null })}
            />
          </label>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 sm:col-span-2">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={p.obrigatoria} onChange={(e) => onAtualizar({ obrigatoria: e.target.checked })} />
              Obrigatória
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={p.permite_na} onChange={(e) => onAtualizar({ permite_na: e.target.checked })} />
              Permite N/A
            </label>
            {tipo === "sim_nao" && (
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={p.plano_acao} onChange={(e) => onAtualizar({ plano_acao: e.target.checked })} />
                &quot;Não&quot; abre plano de ação
              </label>
            )}
            {tipo === "sim_nao" && (
              <label className="flex items-center gap-1.5">
                Peso na nota
                <input
                  key={`${p.id}-peso-${p.peso}`}
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={p.peso}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  onBlur={(e) => {
                    const peso = Number(e.target.value);
                    if (Number.isFinite(peso) && peso >= 0 && peso !== Number(p.peso)) onAtualizar({ peso });
                  }}
                />
              </label>
            )}
          </div>
          <ExigenciasPorResposta tipo={tipo} opcoes={p.opcoes} exige={p.exige} onSalvar={(exige) => onAtualizar({ exige })} />
          <Condicionais
            tipo={tipo}
            opcoes={p.opcoes}
            dependencias={dependencias}
            alvos={alvos}
            onAdicionar={onAdicionarCondicional}
            onRemover={onRemoverCondicional}
          />
        </div>
      )}
    </li>
  );
}

function NovaPergunta({ onAdd }: { onAdd: (texto: string) => void }) {
  const [texto, setTexto] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(texto);
        setTexto("");
      }}
      className="flex items-center gap-2"
    >
      <input
        className={inputCls}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Nova pergunta…"
      />
      <button type="submit" className={`${btnSecundario} shrink-0 py-2`}>
        + Adicionar
      </button>
    </form>
  );
}
