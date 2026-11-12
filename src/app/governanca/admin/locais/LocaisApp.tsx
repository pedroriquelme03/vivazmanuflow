"use client";

import { useState } from "react";
import Link from "next/link";
import { limparNome, type PropriedadeRef } from "@/lib/checklist-setores";
import { idPrimeiraPropriedadeAtiva } from "@/lib/propriedade-opcoes";
import { TIPOS_LOCAL, rotuloTipo, rotuloTipoLocal, type Acomodacao, type TipoAcomodacao } from "@/lib/governanca";
import { ListaCadastroControles, useListaCadastro } from "@/components/ListaCadastroControles";
import { useConfirmacao } from "@/components/Confirmacao";
import { SelectPropriedade } from "../../Seletores";
import { ChaveAtivo, Erro, Titulo, Voltar, btnPequeno, btnPrimario, cardCls, inputCls, labelCls } from "../../ui";
import { useGravar } from "../../useGravar";

type LocalComItens = Acomodacao & { itens: number };

/** Locais do checklist (tabela gov_acomodacoes): UH ou área, de cada propriedade. */
export function LocaisApp({ lista, propriedades }: { lista: LocalComItens[]; propriedades: PropriedadeRef[] }) {
  const { supabase, erro, gravar } = useGravar();
  const [confirmar, janela] = useConfirmacao();
  const [propriedadeId, setPropriedadeId] = useState(idPrimeiraPropriedadeAtiva(propriedades));
  const [tipo, setTipo] = useState<TipoAcomodacao>("apartamento");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [filtroPropriedade, setFiltroPropriedade] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const nomePropriedade = (id: string) => propriedades.find((p) => p.id === id)?.nome ?? "";
  const controles = useListaCadastro(
    lista,
    (l) => `${l.numero} ${rotuloTipo(l.tipo)} ${l.categoria ?? ""} ${nomePropriedade(l.propriedade_id)}`,
    {
      getAtivo: (l) => l.ativo,
      filtro: (l) =>
        (!filtroPropriedade || l.propriedade_id === filtroPropriedade) && (!filtroTipo || l.tipo === filtroTipo),
      pageSizeInicial: 50,
    },
  );

  const opcoesTipo = TIPOS_LOCAL.map((t) => (
    <option key={t} value={t}>
      {rotuloTipoLocal(t)}
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

  async function mudarAtivo(l: LocalComItens, ativo: boolean) {
    if (
      !ativo &&
      !(await confirmar({
        titulo: `Desativar ${l.numero}?`,
        texto: "Ele deixa de aparecer na hora de preencher. O histórico continua.",
        confirmar: "Desativar",
      }))
    ) {
      return;
    }
    gravar(supabase.from("gov_acomodacoes").update({ ativo }).eq("id", l.id));
  }

  return (
    <>
      {janela}
      <Voltar href="/governanca/admin/cadastros">Cadastros</Voltar>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Titulo
          titulo="Locais"
          subtitulo="Onde o checklist é aplicado: UH (suíte ou apartamento) ou uma área, como casa de máquinas. Abra um local para editar os dados, os eletrônicos e a mobília."
        />
        <Link href="/governanca/admin/locais/tipos" className={`${btnPequeno} shrink-0`}>
          Tipos de item
        </Link>
      </div>

      <form onSubmit={adicionar} className={`${cardCls} mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_14rem_1fr_auto] lg:items-end`}>
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
          placeholder="Buscar por número, nome ou categoria…"
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
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {controles.itens.map((l) => (
            <li
              key={l.id}
              className={`flex flex-col rounded-xl border border-slate-200 bg-white p-4 ${l.ativo ? "" : "bg-slate-50 opacity-70"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {rotuloTipoLocal(l.tipo)}
                </span>
                <span className="truncate text-[11px] text-slate-400">{nomePropriedade(l.propriedade_id)}</span>
              </div>
              <p className="mt-2 break-words text-lg font-bold leading-tight text-slate-800">{l.numero}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[l.categoria, l.itens ? `${l.itens} ${l.itens === 1 ? "item" : "itens"}` : "sem itens"]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <ChaveAtivo ativo={l.ativo} onChange={(ativo) => mudarAtivo(l, ativo)} rotulo={l.numero} />
                <Link href={`/governanca/admin/locais/${l.id}`} className={btnPequeno}>
                  Editar
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {lista.length === 0 && <p className="mt-4 text-sm text-slate-500">Nenhum local cadastrado.</p>}
      </div>
    </>
  );
}
