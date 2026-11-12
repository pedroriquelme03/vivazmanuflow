"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { removerDoExige, renomearNoExige, serveDeIdentificador, type Dependencia } from "@/lib/checklist-regras";
import { MODOS_AVALIADO, modoAvaliado, rotuloModoAvaliado, type ModoAvaliado } from "@/lib/checklist-avaliado";
import type { TipoItemPatrimonio } from "@/lib/checklist-patrimonio";
import type { TablesUpdate } from "@/lib/database.types";
import {
  proximaOrdem,
  rotuloAplicacao,
  type Pergunta,
  type Processo,
  type Secao,
  type SecaoComPerguntas,
  type TipoProcesso,
} from "@/lib/governanca";
import { rotuloSetor, type PropriedadeRef, type SetorChecklist } from "@/lib/checklist-setores";
import { ativosOuAtual } from "@/lib/propriedade-opcoes";
import { useConfirmacao } from "@/components/Confirmacao";
import { SelectSetor } from "../../../Seletores";
import {
  Erro,
  btnPequeno,
  btnPequenoPerigo,
  btnPrimario,
  btnSecundario,
  cardCls,
  inputCls,
  labelCls,
} from "../../../ui";
import { useGravar } from "../../../useGravar";
import { CampoLocal } from "../CampoLocal";
import { EditorPergunta, type AlvoCondicional } from "./EditorPergunta";

export function ProcessoEditor({
  processo,
  secoes,
  setores,
  propriedades,
  meusSetores,
  dependencias,
  tiposItem,
}: {
  processo: Processo;
  secoes: SecaoComPerguntas[];
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  /** Setores para onde a pessoa pode mover o checklist (admin: todos; líder: os dele). */
  meusSetores: SetorChecklist[];
  /** Condicionais das perguntas deste checklist. */
  dependencias: Dependencia[];
  /** Tipos de item do patrimônio (TV, ar...), para conferir na UH. */
  tiposItem: TipoItemPatrimonio[];
}) {
  const { supabase, erro, gravar } = useGravar();
  const [confirmar, janela] = useConfirmacao();
  const [novaSecao, setNovaSecao] = useState("");
  const perguntas = secoes.flatMap((s) => s.gov_perguntas);
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
    gravar(supabase.from("gov_secoes").insert({ processo_id: processo.id, nome, ordem: proximaOrdem(secoes) }));
  }

  function renomearSecao(s: Secao, nome: string) {
    if (!nome.trim() || nome.trim() === s.nome) return;
    gravar(supabase.from("gov_secoes").update({ nome: nome.trim() }).eq("id", s.id));
  }

  async function removerSecao(s: SecaoComPerguntas) {
    const ok = await confirmar({
      titulo: `Excluir a seção "${s.nome}"?`,
      texto: `As ${s.gov_perguntas.length} perguntas dela também são apagadas. Respostas já dadas continuam no histórico.`,
      confirmar: "Excluir seção",
      perigo: true,
    });
    if (ok) gravar(supabase.from("gov_secoes").delete().eq("id", s.id));
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

  async function removerPergunta(p: Pergunta) {
    const ok = await confirmar({
      titulo: "Excluir esta pergunta?",
      texto: `"${p.texto}". Respostas já dadas continuam no histórico.`,
      confirmar: "Excluir pergunta",
      perigo: true,
    });
    if (ok) gravar(supabase.from("gov_perguntas").delete().eq("id", p.id));
  }

  /** Renomear a opção leva junto o que estava ligado a ela (obrigatórios e condicionais). */
  function renomearOpcao(p: Pergunta, antiga: string, nova: string) {
    gravar(
      Promise.all([
        supabase
          .from("gov_perguntas")
          .update({ opcoes: p.opcoes.map((o) => (o === antiga ? nova : o)), exige: renomearNoExige(p.exige, antiga, nova) })
          .eq("id", p.id),
        supabase.from("gov_dependencias").update({ gatilho: nova }).eq("pergunta_id", p.id).eq("gatilho", antiga),
      ]).then(([a, b]) => ({ error: a.error ?? b.error })),
    );
  }

  async function removerOpcao(p: Pergunta, opcao: string) {
    const ligadas = dependencias.filter((d) => d.pergunta_id === p.id && d.gatilho === opcao).length;
    const ok = await confirmar({
      titulo: `Remover a opção "${opcao}"?`,
      texto: ligadas ? `${ligadas} condicional(is) ligada(s) a ela também saem.` : undefined,
      confirmar: "Remover",
      perigo: true,
    });
    if (!ok) return;
    gravar(
      Promise.all([
        supabase
          .from("gov_perguntas")
          .update({ opcoes: p.opcoes.filter((o) => o !== opcao), exige: removerDoExige(p.exige, opcao) })
          .eq("id", p.id),
        supabase.from("gov_dependencias").delete().eq("pergunta_id", p.id).eq("gatilho", opcao),
      ]).then(([a, b]) => ({ error: a.error ?? b.error })),
    );
  }

  return (
    <>
      {janela}
      <Link href="/governanca/admin/processos" className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Gerenciar checklists
      </Link>

      <DadosProcesso
        processo={processo}
        total={perguntas.length}
        perguntas={perguntas}
        setores={setores}
        propriedades={propriedades}
        meusSetores={meusSetores}
        onSalvar={(patch) => gravar(supabase.from("gov_processos").update(patch).eq("id", processo.id))}
      />

      <Erro texto={erro} />

      <div className="space-y-4">
        {secoes.map((s, idx) => (
          <div key={s.id} className={cardCls}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                key={`${s.id}-${s.nome}`}
                defaultValue={s.nome}
                onBlur={(e) => renomearSecao(s, e.target.value)}
                aria-label="Nome da seção"
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-bold outline-none hover:border-slate-200 focus:border-slate-300"
              />
              <span className="text-xs text-slate-400">
                {s.gov_perguntas.length} {s.gov_perguntas.length === 1 ? "pergunta" : "perguntas"}
              </span>
              <button type="button" onClick={() => moverSecao(idx, -1)} disabled={idx === 0} className={btnPequeno} aria-label="Subir seção">
                ↑
              </button>
              <button
                type="button"
                onClick={() => moverSecao(idx, 1)}
                disabled={idx === secoes.length - 1}
                className={btnPequeno}
                aria-label="Descer seção"
              >
                ↓
              </button>
              <button type="button" onClick={() => removerSecao(s)} className={btnPequenoPerigo}>
                Excluir seção
              </button>
            </div>

            <ul className="mb-3 divide-y divide-slate-100">
              {s.gov_perguntas.map((p, i) => (
                <EditorPergunta
                  key={p.id}
                  numero={i + 1}
                  pergunta={p}
                  dependencias={dependencias.filter((d) => d.pergunta_id === p.id)}
                  alvos={alvos.filter((a) => a.id !== p.id && a.id !== s.id)}
                  tiposItem={tiposItem}
                  usaLocal={processo.usa_acomodacao}
                  onAtualizar={(patch) => atualizarPergunta(p, patch)}
                  onRemover={() => removerPergunta(p)}
                  onRenomearOpcao={(antiga, nova) => renomearOpcao(p, antiga, nova)}
                  onRemoverOpcao={(opcao) => removerOpcao(p, opcao)}
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
              {s.gov_perguntas.length === 0 && <li className="py-2 text-sm text-slate-500">Nenhuma pergunta nesta seção.</li>}
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
  perguntas,
  setores,
  propriedades,
  meusSetores,
  onSalvar,
}: {
  processo: Processo;
  total: number;
  perguntas: Pergunta[];
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
  const [identificador, setIdentificador] = useState(processo.identificador_pergunta_id ?? "");
  const [avaliado, setAvaliado] = useState<ModoAvaliado>(modoAvaliado(processo.avaliado));
  const perguntaIdentificador = perguntas.find((q) => q.id === processo.identificador_pergunta_id);

  if (!editando) {
    return (
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {rotuloSetor(processo.setor_id, setores, propriedades)}
          </p>
          <h1 className="text-xl font-bold">{processo.nome}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {total} {total === 1 ? "pergunta" : "perguntas"} · {rotuloAplicacao(processo)}
            {processo.descricao ? ` · ${processo.descricao}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Avaliado: {rotuloModoAvaliado(processo.avaliado)}</p>
          {perguntaIdentificador && (
            <p className="mt-0.5 text-xs text-slate-500">Identifica pela resposta de: {perguntaIdentificador.texto}</p>
          )}
        </div>
        <button type="button" onClick={() => setEditando(true)} className={`${btnSecundario} shrink-0 py-2`}>
          Editar dados
        </button>
      </div>
    );
  }

  return (
    <form
      className={`${cardCls} mb-5 space-y-4`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) return;
        onSalvar({
          nome: nome.trim(),
          setor_id: setorId,
          descricao: descricao.trim() || null,
          usa_acomodacao: usaAcomodacao,
          tipo: usaAcomodacao ? tipo : "ambos",
          identificador_pergunta_id: identificador || null,
          avaliado,
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
      <fieldset>
        <legend className={labelCls}>Quem é avaliado</legend>
        <div className="grid gap-2 lg:grid-cols-3">
          {MODOS_AVALIADO.map((m) => (
            <label
              key={m.valor}
              className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${
                avaliado === m.valor ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="avaliado"
                className="mt-0.5"
                checked={avaliado === m.valor}
                onChange={() => setAvaliado(m.valor)}
              />
              <span className="min-w-0">
                <b className="block text-slate-800">{m.rotulo}</b>
                <span className="block text-xs text-slate-500">{m.descricao}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className={labelCls}>Pergunta que identifica cada aplicação (opcional)</span>
        <select className={inputCls} value={identificador} onChange={(e) => setIdentificador(e.target.value)}>
          <option value="">Nenhuma</option>
          {perguntas
            .filter((q) => serveDeIdentificador(q.tipo) || q.id === processo.identificador_pergunta_id)
            .map((q) => (
              <option key={q.id} value={q.id}>
                {q.texto}
              </option>
            ))}
        </select>
        <span className="mt-1 block text-xs text-slate-500">
          A resposta dela aparece junto do nome do checklist nas listas e no Kanban. Ex.: no checklist de eventos, a
          pergunta “Evento” faz aparecer “Natal”, “Carnaval”…
        </span>
      </label>
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
      <input className={inputCls} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nova pergunta…" />
      <button type="submit" className={`${btnSecundario} shrink-0 py-2`} disabled={!texto.trim()}>
        + Adicionar
      </button>
    </form>
  );
}
