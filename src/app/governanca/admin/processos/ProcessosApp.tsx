"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MIGRATION_HINT_GOV,
  erroSchemaGov,
  rotuloTipoProcesso,
  type Processo,
  type TipoProcesso,
} from "@/lib/governanca";
import { Erro, btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../ui";

export function ProcessosApp({ lista }: { lista: (Processo & { perguntas: number })[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<TipoProcesso>("ambos");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("gov_processos")
      .insert({ nome: nome.trim(), descricao: descricao.trim() || null, tipo })
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
          <h1 className="text-xl font-bold">Checklists</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Cada checklist tem suas seções (ex.: Acomodação, Banheiro) e perguntas.
          </p>
        </div>
        <button type="button" onClick={() => setAberto((v) => !v)} className={btnPrimario}>
          + Novo
        </button>
      </div>

      {aberto && (
        <form onSubmit={adicionar} className={`${cardCls} mb-6 space-y-3`}>
          <label className="block">
            <span className={labelCls}>Nome do checklist</span>
            <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Checklist Pós-Checkout" />
          </label>
          <label className="block">
            <span className={labelCls}>Descrição (opcional)</span>
            <input className={inputCls} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Breve descrição" />
          </label>
          <label className="block">
            <span className={labelCls}>Aplica-se a</span>
            <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoProcesso)}>
              <option value="ambos">Ambos (suíte e apartamento)</option>
              <option value="apartamento">Apenas apartamentos</option>
              <option value="suite">Apenas suítes</option>
            </select>
          </label>
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

      <div className="space-y-2">
        {lista.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${p.ativo ? "" : "opacity-60"}`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-lg">📋</span>
            <Link href={`/governanca/admin/processos/${p.id}`} className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.nome}</p>
              <p className="truncate text-xs text-slate-500">
                {p.perguntas} {p.perguntas === 1 ? "pergunta" : "perguntas"}
                {p.descricao ? ` · ${p.descricao}` : ""}
              </p>
            </Link>
            <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 sm:inline">
              {rotuloTipoProcesso(p.tipo)}
            </span>
            <button
              type="button"
              onClick={() => alternarAtivo(p)}
              className={`text-xs font-medium ${p.ativo ? "text-emerald-600" : "text-slate-400"}`}
            >
              {p.ativo ? "Ativo" : "Inativo"}
            </button>
            <button type="button" onClick={() => remover(p)} className="text-xs text-slate-400 hover:text-red-600">
              Remover
            </button>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-slate-500">Nenhum checklist cadastrado.</p>}
      </div>
    </>
  );
}
