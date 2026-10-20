"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MIGRATION_HINT_GOV,
  erroSchemaGov,
  rotuloTipo,
  type Acomodacao,
  type TipoAcomodacao,
} from "@/lib/governanca";
import { Erro, Titulo, btnPrimario, cardCls, inputCls, labelCls } from "../../ui";

export function AcomodacoesApp({ lista }: { lista: Acomodacao[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState<TipoAcomodacao>("apartamento");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!numero.trim()) return;
    setSalvando(true);
    setErro(null);
    const { error } = await supabase.from("gov_acomodacoes").insert({ numero: numero.trim(), tipo });
    setSalvando(false);
    if (error) {
      if (erroSchemaGov(error.message, error.code)) return setErro(MIGRATION_HINT_GOV);
      return setErro(
        error.code === "23505" ? "Já existe uma acomodação com esse número." : error.message,
      );
    }
    setNumero("");
    router.refresh();
  }

  async function alternarAtivo(a: Acomodacao) {
    await supabase.from("gov_acomodacoes").update({ ativo: !a.ativo }).eq("id", a.id);
    router.refresh();
  }

  async function remover(a: Acomodacao) {
    if (!confirm(`Remover a acomodação UH ${a.numero}?`)) return;
    const { error } = await supabase.from("gov_acomodacoes").delete().eq("id", a.id);
    if (error) {
      setErro(
        error.code === "23503"
          ? `A UH ${a.numero} já tem inspeções. Marque como inativa em vez de remover.`
          : error.message,
      );
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Titulo titulo="Acomodações" subtitulo="Cadastre as unidades habitacionais (UH) do hotel." />

      <form onSubmit={adicionar} className={`${cardCls} mb-6 flex flex-col gap-3 sm:flex-row sm:items-end`}>
        <label className="block flex-1">
          <span className={labelCls}>Número da UH</span>
          <input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex.: 1005" />
        </label>
        <label className="block sm:w-48">
          <span className={labelCls}>Tipo</span>
          <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoAcomodacao)}>
            <option value="apartamento">Apartamento</option>
            <option value="suite">Suíte</option>
          </select>
        </label>
        <button type="submit" className={btnPrimario} disabled={salvando}>
          + Adicionar
        </button>
      </form>

      <Erro texto={erro} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {lista.map((a) => (
          <div key={a.id} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${a.ativo ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase text-slate-400">UH</p>
                <p className="text-2xl font-bold">{a.numero}</p>
              </div>
              <button
                type="button"
                onClick={() => remover(a)}
                className="text-xs text-slate-400 hover:text-red-600"
                aria-label={`Remover UH ${a.numero}`}
              >
                Remover
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {rotuloTipo(a.tipo)}
              </span>
              <button
                type="button"
                onClick={() => alternarAtivo(a)}
                className={`text-xs font-medium ${a.ativo ? "text-brand-600" : "text-slate-400"}`}
              >
                {a.ativo ? "Ativa" : "Inativa"}
              </button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-slate-500">Nenhuma acomodação cadastrada.</p>}
      </div>
    </>
  );
}
