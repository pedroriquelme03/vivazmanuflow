"use client";

import { useState } from "react";
import Link from "next/link";
import { limparNome, type PropriedadeRef, type SetorChecklist } from "@/lib/checklist-setores";
import { idPrimeiraPropriedadeAtiva } from "@/lib/propriedade-opcoes";
import type { Acomodacao } from "@/lib/governanca";
import {
  ancestrais,
  caminhoLugar,
  noCaminho,
  tipoLegadoDoLocal,
  type CaminhoFiltro,
  type Lugar,
} from "@/lib/checklist-lugares";
import { ListaCadastroControles, useListaCadastro } from "@/components/ListaCadastroControles";
import { useConfirmacao } from "@/components/Confirmacao";
import { EscolhaLugar, FiltroCaminho } from "../../Lugares";
import { SelectPropriedade, SelectSetor } from "../../Seletores";
import { ChaveAtivo, Erro, Titulo, Voltar, btnPequeno, btnPrimario, cardCls, inputCls, labelCls } from "../../ui";
import { useGravar } from "../../useGravar";

type LocalComItens = Acomodacao & { itens: number; setores: string[] };

/**
 * Locais específicos (UH 1000, Casa de Máquinas 1...), cada um num ponto da árvore:
 * Unidade → Categoria → Tipo → Classificação. Filtra pela árvore e pelo setor que cuida.
 */
export function LocaisApp({
  lista,
  propriedades,
  lugares,
  setores,
}: {
  lista: LocalComItens[];
  propriedades: PropriedadeRef[];
  lugares: Lugar[];
  setores: SetorChecklist[];
}) {
  const { supabase, erro, setErro, gravar } = useGravar();
  const [confirmar, janela] = useConfirmacao();
  const [propriedadeId, setPropriedadeId] = useState(idPrimeiraPropriedadeAtiva(propriedades));
  const [lugarId, setLugarId] = useState("");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [filtroPropriedade, setFiltroPropriedade] = useState("");
  const [filtroCaminho, setFiltroCaminho] = useState<CaminhoFiltro>([]);
  const [filtroSetor, setFiltroSetor] = useState("");

  const nomePropriedade = (id: string) => propriedades.find((p) => p.id === id)?.nome ?? "";
  const lugarEscolhido = lugares.find((l) => l.id === lugarId);
  const podeAdicionar = Boolean(lugarEscolhido && lugarEscolhido.nivel !== "categoria" && limparNome(nome));

  const controles = useListaCadastro(
    lista,
    (l) => `${l.numero} ${caminhoLugar(lugares, l.lugar_id)} ${nomePropriedade(l.propriedade_id)}`,
    {
      getAtivo: (l) => l.ativo,
      filtro: (l) =>
        (!filtroPropriedade || l.propriedade_id === filtroPropriedade) &&
        noCaminho(lugares, l.lugar_id, filtroCaminho) &&
        (!filtroSetor || l.setores.includes(filtroSetor)),
      pageSizeInicial: 50,
    },
  );

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo || !propriedadeId) return;
    if (!lugarEscolhido || lugarEscolhido.nivel === "categoria") return setErro("Escolha pelo menos o tipo de espaço.");
    const classificacao = lugarEscolhido.nivel === "classificacao" ? lugarEscolhido.nome.toUpperCase() : null;
    setSalvando(true);
    const ok = await gravar(
      supabase.from("gov_acomodacoes").insert({
        numero: limpo,
        tipo: tipoLegadoDoLocal(lugares, lugarId),
        propriedade_id: propriedadeId,
        lugar_id: lugarId,
        categoria: classificacao,
      }),
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
          subtitulo="Cada local fica num ponto da árvore: Unidade → Categoria → Tipo de espaço → Classificação. Abra um local para editar os dados e os itens."
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/governanca/admin/locais/estrutura" className={btnPequeno}>
            Categorias e tipos
          </Link>
          <Link href="/governanca/admin/locais/tipos" className={btnPequeno}>
            Tipos de item
          </Link>
        </div>
      </div>

      <form onSubmit={adicionar} className={`${cardCls} mb-6`}>
        <h2 className="text-base font-semibold text-slate-800">Novo local</h2>
        <p className="mt-0.5 text-sm text-slate-500">Escolha onde ele fica na árvore e dê o nome ou número.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block min-w-0">
            <span className={labelCls}>Unidade</span>
            <SelectPropriedade
              value={propriedadeId}
              onChange={(id) => {
                setPropriedadeId(id);
                setLugarId("");
              }}
              propriedades={propriedades}
            />
          </label>
          <EscolhaLugar lugares={lugares} propriedadeId={propriedadeId} valor={lugarId} onChange={setLugarId} embutido />
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className={labelCls}>Nome ou número</span>
            <input
              className={inputCls}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: 1005, Casa de Máquinas 8, Piscina adulto"
            />
          </label>
          <button type="submit" className={`${btnPrimario} shrink-0`} disabled={salvando || !podeAdicionar}>
            + Adicionar local
          </button>
        </div>
      </form>

      <Erro texto={erro} />

      <div className={cardCls}>
        <ListaCadastroControles
          {...controles}
          placeholder="Buscar por nome, número ou classificação…"
          marcado={Boolean(filtroPropriedade || filtroCaminho.length || filtroSetor)}
          filtrosExtras={
            <>
              <SelectPropriedade
                value={filtroPropriedade}
                onChange={(id) => {
                  setFiltroPropriedade(id);
                  setFiltroCaminho([]);
                }}
                propriedades={propriedades}
                vazio="Todas as unidades"
              />
              <SelectSetor value={filtroSetor} onChange={setFiltroSetor} setores={setores} propriedades={propriedades} vazio="Qualquer setor" />
              <div className="col-span-2 grid gap-2 sm:grid-cols-3">
                <FiltroCaminho
                  lugares={lugares}
                  unidadeId={filtroPropriedade || null}
                  caminho={filtroCaminho}
                  onChange={setFiltroCaminho}
                />
              </div>
            </>
          }
        />
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {controles.itens.map((l) => {
            const cadeia = ancestrais(lugares, l.lugar_id);
            const etiquetas = setores.filter((s) => l.setores.includes(s.id));
            return (
              <li
                key={l.id}
                className={`flex flex-col rounded-xl border border-slate-200 bg-white p-4 ${l.ativo ? "" : "bg-slate-50 opacity-70"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      cadeia.length ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {cadeia[0]?.nome ?? "Sem lugar na árvore"}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">{nomePropriedade(l.propriedade_id)}</span>
                </div>
                <p className="mt-2 break-words text-lg font-bold leading-tight text-slate-800">{l.numero}</p>
                <p className="mt-0.5 break-words text-xs text-slate-500">
                  {[cadeia.slice(1).map((c) => c.nome).join(" › "), l.itens ? `${l.itens} ${l.itens === 1 ? "item" : "itens"}` : ""]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                {etiquetas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {etiquetas.map((s) => (
                      <span key={s.id} className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                        {s.nome}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <ChaveAtivo ativo={l.ativo} onChange={(ativo) => mudarAtivo(l, ativo)} rotulo={l.numero} />
                  <Link href={`/governanca/admin/locais/${l.id}`} className={btnPequeno}>
                    Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
        {lista.length === 0 && <p className="mt-4 text-sm text-slate-500">Nenhum local cadastrado.</p>}
      </div>
    </>
  );
}
