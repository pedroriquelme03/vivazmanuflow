"use client";

import { useState } from "react";
import { limparNome, type PropriedadeRef } from "@/lib/checklist-setores";
import { idPrimeiraPropriedadeAtiva } from "@/lib/propriedade-opcoes";
import { rotuloTipo, type Acomodacao, type TipoAcomodacao } from "@/lib/governanca";
import { ListaCadastroControles, useListaCadastro } from "@/components/ListaCadastroControles";
import { SelectPropriedade } from "../../Seletores";
import { BotaoAtivo, Erro, Titulo, btnPrimario, cardCls, inputCls, labelCls } from "../../ui";
import { useGravar } from "../../useGravar";

const TIPOS: TipoAcomodacao[] = ["apartamento", "suite", "area"];
const rotuloOpcao = (tipo: TipoAcomodacao) => (tipo === "area" ? "Área" : `UH · ${rotuloTipo(tipo)}`);

/** Locais do checklist (tabela gov_acomodacoes): UH ou área, de cada propriedade. */
export function LocaisApp({ lista, propriedades }: { lista: Acomodacao[]; propriedades: PropriedadeRef[] }) {
  const { supabase, erro, gravar } = useGravar();
  const [propriedadeId, setPropriedadeId] = useState(idPrimeiraPropriedadeAtiva(propriedades));
  const [tipo, setTipo] = useState<TipoAcomodacao>("apartamento");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [filtroPropriedade, setFiltroPropriedade] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const nomePropriedade = (id: string) => propriedades.find((p) => p.id === id)?.nome ?? "";
  const controles = useListaCadastro(lista, (l) => `${l.numero} ${rotuloTipo(l.tipo)} ${nomePropriedade(l.propriedade_id)}`, {
    getAtivo: (l) => l.ativo,
    filtro: (l) =>
      (!filtroPropriedade || l.propriedade_id === filtroPropriedade) && (!filtroTipo || l.tipo === filtroTipo),
  });

  const opcoesTipo = TIPOS.map((t) => (
    <option key={t} value={t}>
      {rotuloOpcao(t)}
    </option>
  ));

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo || !propriedadeId) return;
    setSalvando(true);
    const ok = await gravar(
      supabase.from("gov_acomodacoes").insert({ numero: limpo, tipo, propriedade_id: propriedadeId }),
      { "23505": `Já existe "${limpo}" em ${nomePropriedade(propriedadeId)}.` },
    );
    setSalvando(false);
    if (ok) setNome("");
  }

  function remover(l: Acomodacao) {
    if (!confirm(`Remover ${l.numero}?`)) return;
    gravar(supabase.from("gov_acomodacoes").delete().eq("id", l.id), {
      "23503": `${l.numero} já tem checklists aplicados. Marque como inativo em vez de remover.`,
    });
  }

  return (
    <>
      <Titulo
        titulo="Locais"
        subtitulo="Onde o checklist é aplicado: UH (suíte ou apartamento) ou uma área, como casa de máquinas ou bilheteria."
      />

      <form onSubmit={adicionar} className={`${cardCls} mb-6 grid gap-3 sm:grid-cols-[12rem_12rem_1fr_auto] sm:items-end`}>
        <label className="block">
          <span className={labelCls}>Propriedade</span>
          <SelectPropriedade value={propriedadeId} onChange={setPropriedadeId} propriedades={propriedades} />
        </label>
        <label className="block">
          <span className={labelCls}>Tipo</span>
          <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoAcomodacao)}>
            {opcoesTipo}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{tipo === "area" ? "Nome da área" : "Número da UH"}</span>
          <input
            className={inputCls}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={tipo === "area" ? "Ex.: Casa de máquinas 1" : "Ex.: 1005"}
          />
        </label>
        <button type="submit" className={btnPrimario} disabled={salvando || !nome.trim()}>
          + Adicionar
        </button>
      </form>

      <Erro texto={erro} />

      <div className={cardCls}>
        <ListaCadastroControles
          {...controles}
          placeholder="Buscar local…"
          marcado={Boolean(filtroPropriedade || filtroTipo)}
          filtrosExtras={
            <>
              <SelectPropriedade
                value={filtroPropriedade}
                onChange={setFiltroPropriedade}
                propriedades={propriedades}
                vazio="Todas as propriedades"
              />
              <select className={inputCls} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">UHs e áreas</option>
                {opcoesTipo}
              </select>
            </>
          }
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {controles.itens.map((l) => (
            <div key={l.id} className={`rounded-xl border border-slate-200 bg-white p-3 ${l.ativo ? "" : "opacity-60"}`}>
              <p className="text-xs uppercase text-slate-400">{l.tipo === "area" ? "Área" : "UH"}</p>
              <p className="truncate text-lg font-bold" title={l.numero}>
                {l.numero}
              </p>
              <p className="truncate text-xs text-slate-500">
                {nomePropriedade(l.propriedade_id)}
                {l.tipo === "area" ? "" : ` · ${rotuloTipo(l.tipo)}`}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <BotaoAtivo
                  ativo={l.ativo}
                  onClick={() => gravar(supabase.from("gov_acomodacoes").update({ ativo: !l.ativo }).eq("id", l.id))}
                />
                <button type="button" onClick={() => remover(l)} className="text-xs text-slate-400 hover:text-red-600">
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
        {lista.length === 0 && <p className="mt-4 text-sm text-slate-500">Nenhum local cadastrado.</p>}
      </div>
    </>
  );
}
