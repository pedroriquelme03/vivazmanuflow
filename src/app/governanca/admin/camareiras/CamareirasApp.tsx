"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MIGRATION_HINT_GOV, erroSchemaGov, type Camareira } from "@/lib/governanca";
import { Erro, Titulo, btnPrimario, cardCls, inputCls, labelCls } from "../../ui";

export function CamareirasApp({ lista }: { lista: Camareira[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    const { error } = await supabase.from("gov_camareiras").insert({ nome: nome.trim() });
    setSalvando(false);
    if (error) {
      return setErro(erroSchemaGov(error.message, error.code) ? MIGRATION_HINT_GOV : error.message);
    }
    setNome("");
    router.refresh();
  }

  async function alternarAtivo(c: Camareira) {
    await supabase.from("gov_camareiras").update({ ativo: !c.ativo }).eq("id", c.id);
    router.refresh();
  }

  async function renomear(c: Camareira) {
    const novo = prompt("Nome da camareira", c.nome)?.trim();
    if (!novo || novo === c.nome) return;
    const { error } = await supabase.from("gov_camareiras").update({ nome: novo }).eq("id", c.id);
    if (error) return setErro(error.message);
    router.refresh();
  }

  async function remover(c: Camareira) {
    if (!confirm(`Remover ${c.nome}?`)) return;
    const { error } = await supabase.from("gov_camareiras").delete().eq("id", c.id);
    if (error) return setErro(error.message);
    router.refresh();
  }

  return (
    <>
      <Titulo
        titulo="Camareiras"
        subtitulo="Equipe de limpeza que os líderes selecionam nas inspeções."
      />

      <form onSubmit={adicionar} className={`${cardCls} mb-6 flex flex-col gap-3 sm:flex-row sm:items-end`}>
        <label className="block flex-1">
          <span className={labelCls}>Nome da camareira</span>
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
        </label>
        <button type="submit" className={btnPrimario} disabled={salvando}>
          + Adicionar
        </button>
      </form>

      <Erro texto={erro} />

      <div className="space-y-2">
        {lista.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${c.ativo ? "" : "opacity-60"}`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
              {c.nome.charAt(0)}
            </span>
            <span className="flex-1 font-medium">{c.nome}</span>
            <button
              type="button"
              onClick={() => alternarAtivo(c)}
              className={`text-xs font-medium ${c.ativo ? "text-brand-600" : "text-slate-400"}`}
            >
              {c.ativo ? "Ativa" : "Inativa"}
            </button>
            <button
              type="button"
              onClick={() => renomear(c)}
              className="text-xs text-slate-400 hover:text-brand-600"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => remover(c)}
              className="text-xs text-slate-400 hover:text-red-600"
            >
              Remover
            </button>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-slate-500">Nenhuma camareira cadastrada.</p>}
      </div>
    </>
  );
}
