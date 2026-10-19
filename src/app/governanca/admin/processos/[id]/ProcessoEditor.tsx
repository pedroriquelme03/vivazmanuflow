"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  proximaOrdem,
  type Pergunta,
  type Processo,
  type Secao,
  type SecaoComPerguntas,
} from "@/lib/governanca";
import { Erro, btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../../ui";

export function ProcessoEditor({
  processo,
  secoes,
}: {
  processo: Processo;
  secoes: SecaoComPerguntas[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [novaSecao, setNovaSecao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function rodar(acao: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await acao;
    if (error) return setErro(error.message);
    setErro(null);
    router.refresh();
  }

  function addSecao(e: React.FormEvent) {
    e.preventDefault();
    if (!novaSecao.trim()) return;
    const nome = novaSecao.trim();
    setNovaSecao("");
    rodar(
      supabase
        .from("gov_secoes")
        .insert({ processo_id: processo.id, nome, ordem: proximaOrdem(secoes) }),
    );
  }

  function renomearSecao(s: Secao, nome: string) {
    if (!nome.trim() || nome.trim() === s.nome) return;
    rodar(supabase.from("gov_secoes").update({ nome: nome.trim() }).eq("id", s.id));
  }

  function removerSecao(s: Secao) {
    if (!confirm(`Remover a seção "${s.nome}" e todas as suas perguntas?`)) return;
    rodar(supabase.from("gov_secoes").delete().eq("id", s.id));
  }

  function moverSecao(idx: number, delta: -1 | 1) {
    const outra = secoes[idx + delta];
    const atual = secoes[idx];
    if (!outra) return;
    rodar(
      Promise.all([
        supabase.from("gov_secoes").update({ ordem: outra.ordem }).eq("id", atual.id),
        supabase.from("gov_secoes").update({ ordem: atual.ordem }).eq("id", outra.id),
      ]).then(([a, b]) => ({ error: a.error ?? b.error })),
    );
  }

  function addPergunta(secao: SecaoComPerguntas, texto: string) {
    if (!texto.trim()) return;
    rodar(
      supabase.from("gov_perguntas").insert({
        secao_id: secao.id,
        texto: texto.trim(),
        ordem: proximaOrdem(secao.gov_perguntas),
      }),
    );
  }

  function editarPergunta(p: Pergunta, texto: string) {
    if (!texto.trim() || texto.trim() === p.texto) return;
    rodar(supabase.from("gov_perguntas").update({ texto: texto.trim() }).eq("id", p.id));
  }

  function removerPergunta(p: Pergunta) {
    rodar(supabase.from("gov_perguntas").delete().eq("id", p.id));
  }

  return (
    <>
      <Link
        href="/governanca/admin/processos"
        className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800"
      >
        ← Checklists
      </Link>
      <h1 className="text-xl font-bold">{processo.nome}</h1>
      <p className="mb-5 mt-0.5 text-sm text-slate-500">
        {processo.descricao || "Organize as seções e perguntas do checklist."}
      </p>

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

            <ul className="mb-3 space-y-2">
              {s.gov_perguntas.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right text-xs text-slate-400">{i + 1}.</span>
                  <input
                    key={`${p.id}-${p.texto}`}
                    defaultValue={p.texto}
                    onBlur={(e) => editarPergunta(p, e.target.value)}
                    aria-label={`Pergunta ${i + 1}`}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => removerPergunta(p)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Remover pergunta"
                  >
                    ✕
                  </button>
                </li>
              ))}
              {s.gov_perguntas.length === 0 && (
                <li className="text-sm text-slate-500">Nenhuma pergunta nesta seção.</li>
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
            placeholder="Ex.: Acomodação, Banheiro, Varanda…"
          />
        </label>
        <button type="submit" className={btnPrimario}>
          + Adicionar seção
        </button>
      </form>
    </>
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
