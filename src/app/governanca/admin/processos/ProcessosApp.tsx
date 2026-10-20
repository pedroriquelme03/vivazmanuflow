"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MIGRATION_HINT_GOV,
  agruparPorCategoria,
  erroSchemaGov,
  normalizarBusca,
  rotuloAplicacao,
  type Processo,
  type TipoProcesso,
} from "@/lib/governanca";
import { Erro, btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../ui";

export function ProcessosApp({
  lista,
  abrirNovo = false,
}: {
  lista: (Processo & { perguntas: number })[];
  abrirNovo?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [aberto, setAberto] = useState(abrirNovo);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [usaAcomodacao, setUsaAcomodacao] = useState(false);
  const [tipo, setTipo] = useState<TipoProcesso>("ambos");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const categorias = [...new Set(lista.map((p) => p.categoria).filter(Boolean))] as string[];
  const grupos = agruparPorCategoria(
    lista.filter((p) => {
      const q = normalizarBusca(busca);
      return !q || normalizarBusca(`${p.categoria ?? ""} ${p.nome}`).includes(q);
    }),
  );

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("gov_processos")
      .insert({
        nome: nome.trim(),
        categoria: categoria.trim().toUpperCase() || null,
        descricao: descricao.trim() || null,
        usa_acomodacao: usaAcomodacao,
        tipo: usaAcomodacao ? tipo : "ambos",
      })
      .select("id")
      .single();
    setSalvando(false);
    if (error || !data) {
      return setErro(
        error && erroSchemaGov(error.message, error.code) ? MIGRATION_HINT_GOV : error?.message ?? "Erro ao criar.",
      );
    }
    router.push(`/governanca/admin/processos/${data.id}`);
  }

  async function alternarAtivo(p: Processo) {
    await supabase.from("gov_processos").update({ ativo: !p.ativo }).eq("id", p.id);
    router.refresh();
  }

  async function remover(p: Processo) {
    if (!confirm(`Remover o checklist "${p.nome}"? Todas as seções e perguntas serão excluídas.`)) return;
    const { error } = await supabase.from("gov_processos").delete().eq("id", p.id);
    if (error) {
      return setErro(
        error.code === "23503"
          ? `"${p.nome}" já foi usado em inspeções. Marque como inativo em vez de remover.`
          : error.message,
      );
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Gerenciar checklists</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {lista.length} checklists. Cada um tem seções e itens de vários tipos.
          </p>
        </div>
        <button type="button" onClick={() => setAberto((v) => !v)} className={btnPrimario}>
          + Criar checklist
        </button>
      </div>

      {aberto && (
        <form onSubmit={adicionar} className={`${cardCls} mb-6 space-y-3`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Nome do checklist</span>
              <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Revisão diária de suítes" />
            </label>
            <label className="block">
              <span className={labelCls}>Categoria</span>
              <input
                className={inputCls}
                list="categorias-checklist"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex.: GOVERNANÇA"
              />
              <datalist id="categorias-checklist">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>Descrição (opcional)</span>
            <input className={inputCls} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Breve descrição" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={usaAcomodacao} onChange={(e) => setUsaAcomodacao(e.target.checked)} />
            Pede a acomodação (UH) antes de começar
          </label>
          {usaAcomodacao && (
            <label className="block">
              <span className={labelCls}>Aplica-se a</span>
              <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoProcesso)}>
                <option value="ambos">Ambos (suíte e apartamento)</option>
                <option value="apartamento">Apenas apartamentos</option>
                <option value="suite">Apenas suítes</option>
              </select>
            </label>
          )}
          <div className="flex gap-2">
            <button type="submit" className={btnPrimario} disabled={salvando}>
              Criar checklist
            </button>
            <button type="button" className={btnSecundario} onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <Erro texto={erro} />

      <input
        className={`${inputCls} mb-4`}
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar checklist…"
      />

      {grupos.map((g) => (
        <section key={g.categoria} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {g.categoria} · {g.itens.length}
          </h2>
          <div className="space-y-2">
            {g.itens.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${p.ativo ? "" : "opacity-60"}`}
              >
                <Link href={`/governanca/admin/processos/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.nome}</p>
                  <p className="truncate text-xs text-slate-500">
                    {p.perguntas} {p.perguntas === 1 ? "item" : "itens"} · {rotuloAplicacao(p)}
                    {p.descricao ? ` · ${p.descricao}` : ""}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => alternarAtivo(p)}
                  className={`text-xs font-medium ${p.ativo ? "text-brand-600" : "text-slate-400"}`}
                >
                  {p.ativo ? "Ativo" : "Inativo"}
                </button>
                <button type="button" onClick={() => remover(p)} className="text-xs text-slate-400 hover:text-red-600">
                  Remover
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
      {lista.length === 0 && <p className="text-sm text-slate-500">Nenhum checklist cadastrado.</p>}
    </>
  );
}
