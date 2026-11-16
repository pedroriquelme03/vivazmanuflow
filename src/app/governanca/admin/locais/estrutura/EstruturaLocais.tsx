"use client";

import { useState } from "react";
import Link from "next/link";
import { limparNome, type PropriedadeRef } from "@/lib/checklist-setores";
import { descendentes, filhos, type Lugar, type NivelLugar } from "@/lib/checklist-lugares";
import type { GrupoItem } from "@/lib/checklist-patrimonio";
import { useConfirmacao } from "@/components/Confirmacao";
import { ItemMenu, MenuAcoes } from "../../../MenuAcoes";
import { ChaveAtivo, Erro, Titulo, Voltar, btnPequeno, btnPrimario, cardCls, inputCls, labelCls } from "../../../ui";
import { useGravar } from "../../../useGravar";

type Contagem = Record<string, number>;

type Contexto = {
  lugares: Lugar[];
  grupos: GrupoItem[];
  locaisPorLugar: Contagem;
  checklistsPorLugar: Contagem;
  escrita: ReturnType<typeof useGravar>;
  confirmar: ReturnType<typeof useConfirmacao>[0];
  unidade: string;
};

const contar = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Monta a árvore de cada unidade: Categoria → Tipo de espaço → Classificação. Cada
 * categoria abre e fecha; dentro dela, o que a ficha dos locais mostra e os tipos.
 */
export function EstruturaLocais({
  lugares,
  propriedades,
  grupos,
  locaisPorLugar,
  checklistsPorLugar,
  faltaSql,
}: {
  lugares: Lugar[];
  propriedades: PropriedadeRef[];
  grupos: GrupoItem[];
  locaisPorLugar: Contagem;
  checklistsPorLugar: Contagem;
  faltaSql: boolean;
}) {
  const escrita = useGravar();
  const [confirmar, janela] = useConfirmacao();
  const [unidade, setUnidade] = useState(propriedades[0]?.id ?? "");
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const categorias = filhos(lugares, null, unidade, false);
  const ctx: Contexto = { lugares, grupos, locaisPorLugar, checklistsPorLugar, escrita, confirmar, unidade };

  const alternar = (id: string) =>
    setAbertas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  return (
    <>
      {janela}
      <Voltar href="/governanca/admin/locais">Locais</Voltar>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Titulo
          titulo="Categorias e tipos"
          subtitulo="A árvore de cada unidade. Os locais (UH 1000, Casa de Máquinas 1…) você cadastra em Locais, escolhendo onde ficam aqui."
        />
        <Link href="/governanca/admin/locais/tipos" className={`${btnPequeno} shrink-0`}>
          Grupos e tipos de item
        </Link>
      </div>

      <ol className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold" aria-label="Níveis da árvore">
        {["Unidade", "Categoria", "Tipo de espaço", "Classificação (opcional)", "Local"].map((n, i, todos) => (
          <li key={n} className="flex items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-1 ${i === 0 || i === 4 ? "bg-slate-100 text-slate-600" : "bg-brand-50 text-brand-700"}`}>{n}</span>
            {i < todos.length - 1 && <span className="text-slate-300">→</span>}
          </li>
        ))}
      </ol>

      {faltaSql && <Erro texto="Rode no Supabase o SQL supabase/migrations/20261116120000_checklist_locais_arvore.sql." />}
      <Erro texto={escrita.erro} />

      <div className="mb-4 inline-flex max-w-full overflow-x-auto rounded-xl border border-slate-300 text-sm font-semibold">
        {propriedades.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={unidade === p.id}
            onClick={() => setUnidade(p.id)}
            className={`shrink-0 px-4 py-2 ${unidade === p.id ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {p.nome}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {categorias.map((c) => (
          <Categoria key={c.id} categoria={c} aberta={abertas.has(c.id)} onAlternar={() => alternar(c.id)} {...ctx} />
        ))}
        {categorias.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria nesta unidade ainda.</p>}
      </div>

      <div className={`${cardCls} mt-4`}>
        <NovoLugar pai={null} nivel="categoria" rotulo="Nova categoria" exemplo="Ex.: Segurança, Estacionamento" {...ctx} />
      </div>
    </>
  );
}

function Categoria({
  categoria: c,
  aberta,
  onAlternar,
  ...ctx
}: { categoria: Lugar; aberta: boolean; onAlternar: () => void } & Contexto) {
  const { supabase, gravar } = ctx.escrita;
  const tipos = filhos(ctx.lugares, c.id, null, false);
  const totalLocais = [...descendentes(ctx.lugares, c.id)].reduce((s, id) => s + (ctx.locaisPorLugar[id] ?? 0), 0);
  const totalChecklists = [...descendentes(ctx.lugares, c.id)].reduce((s, id) => s + (ctx.checklistsPorLugar[id] ?? 0), 0);
  const mostra = [c.ficha_uh ? "Dados da UH" : null, ...ctx.grupos.filter((g) => c.grupos.includes(g.codigo)).map((g) => g.nome)].filter(
    (x): x is string => Boolean(x),
  );

  function mudarGrupo(codigo: string, ligado: boolean) {
    const grupos = ligado ? [...new Set([...c.grupos, codigo])] : c.grupos.filter((g) => g !== codigo);
    gravar(supabase.from("gov_lugares").update({ grupos }).eq("id", c.id));
  }

  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${c.ativo ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2 p-3 sm:p-4">
        <button type="button" onClick={onAlternar} aria-expanded={aberta} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className={`mt-0.5 text-slate-400 transition ${aberta ? "rotate-90" : ""}`} aria-hidden>
            ▶
          </span>
          <span className="min-w-0">
            <span className="block break-words text-base font-bold text-slate-800">{c.nome}</span>
            <span className="block text-xs text-slate-500">
              {contar(tipos.length, "tipo", "tipos")} · {contar(totalLocais, "local", "locais")}
              {totalChecklists > 0 && ` · ${contar(totalChecklists, "checklist", "checklists")}`}
            </span>
            {mostra.length > 0 && (
              <span className="mt-1.5 flex flex-wrap gap-1">
                {mostra.map((m) => (
                  <span key={m} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {m}
                  </span>
                ))}
              </span>
            )}
          </span>
        </button>
        <ChaveAtivo ativo={c.ativo} rotulo={c.nome} onChange={(ativo) => gravar(supabase.from("gov_lugares").update({ ativo }).eq("id", c.id))} />
      </div>

      {aberta && (
        <div className="space-y-5 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <CampoNome lugar={c} rotulo="Nome da categoria" {...ctx} />
            <BotaoExcluir lugar={c} total={totalLocais} checklists={totalChecklists} temFilhos={tipos.length > 0} {...ctx} />
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className={labelCls}>A ficha dos locais desta categoria mostra</span>
              <Link href="/governanca/admin/locais/tipos" className="text-xs font-semibold text-brand-700 hover:underline">
                Criar ou editar grupos de itens →
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Pilula ligado={c.ficha_uh} onClick={() => gravar(supabase.from("gov_lugares").update({ ficha_uh: !c.ficha_uh }).eq("id", c.id))}>
                Dados da UH
              </Pilula>
              {ctx.grupos
                .filter((g) => g.ativo || c.grupos.includes(g.codigo))
                .map((g) => (
                  <Pilula key={g.codigo} ligado={c.grupos.includes(g.codigo)} onClick={() => mudarGrupo(g.codigo, !c.grupos.includes(g.codigo))}>
                    {g.nome}
                  </Pilula>
                ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Dados da UH = acomodação e se aceita pet. Os grupos viram seções de itens (marca, modelo, patrimônio).</p>
          </div>

          <div>
            <span className={labelCls}>Tipos de espaço</span>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {tipos.map((t) => (
                <Tipo key={t.id} tipo={t} {...ctx} />
              ))}
              {tipos.length === 0 && <li className="px-3 py-2.5 text-sm text-slate-500">Nenhum tipo ainda.</li>}
            </ul>
            <div className="mt-2">
              <NovoLugar pai={c} nivel="tipo" rotulo={`Novo tipo de espaço em ${c.nome}`} exemplo="Ex.: Piscinas, Depósitos" {...ctx} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Um tipo de espaço e as classificações dele (ex.: UH Apartamento → Garden, Luxo...). */
function Tipo({ tipo: t, ...ctx }: { tipo: Lugar } & Contexto) {
  const [novaClassificacao, setNovaClassificacao] = useState(false);
  const classificacoes = filhos(ctx.lugares, t.id, null, false);
  const locais = [...descendentes(ctx.lugares, t.id)].reduce((s, id) => s + (ctx.locaisPorLugar[id] ?? 0), 0);

  return (
    <li className="px-3 py-2.5">
      <Linha lugar={t} total={locais} temFilhos={classificacoes.length > 0} onClassificar={() => setNovaClassificacao(true)} {...ctx} />
      {(classificacoes.length > 0 || novaClassificacao) && (
        <div className="mt-2 space-y-1.5 border-l-2 border-brand-100 pl-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Classificações</span>
          {classificacoes.map((cl) => (
            <Linha key={cl.id} lugar={cl} total={ctx.locaisPorLugar[cl.id] ?? 0} temFilhos={false} pequeno {...ctx} />
          ))}
          {novaClassificacao ? (
            <NovoLugar pai={t} nivel="classificacao" rotulo="" exemplo="Ex.: Garden, Luxo Piscina" compacto onFechar={() => setNovaClassificacao(false)} {...ctx} />
          ) : (
            <button type="button" className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => setNovaClassificacao(true)}>
              + Classificação
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Linha alinhada: nome (renomeia ao sair do campo) · quantos locais · ativo · ⋯ */
function Linha({
  lugar: l,
  total,
  temFilhos,
  pequeno = false,
  onClassificar,
  ...ctx
}: { lugar: Lugar; total: number; temFilhos: boolean; pequeno?: boolean; onClassificar?: () => void } & Contexto) {
  const { supabase, gravar } = ctx.escrita;
  const checklists = ctx.checklistsPorLugar[l.id] ?? 0;
  const podeExcluir = !temFilhos && total === 0 && checklists === 0;

  return (
    <div className={`grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_8.5rem_auto_2rem] ${l.ativo ? "" : "opacity-60"}`}>
      <input
        key={`${l.id}-${l.nome}`}
        defaultValue={l.nome}
        aria-label={`Nome de ${l.nome}`}
        className={`${inputCls} col-span-2 sm:col-span-1 ${pequeno ? "py-1.5" : "font-medium"}`}
        onBlur={(e) => {
          const nome = limparNome(e.target.value);
          if (!nome) e.target.value = l.nome;
          else if (nome !== l.nome) gravar(supabase.from("gov_lugares").update({ nome }).eq("id", l.id), { "23505": `Já existe "${nome}" aqui.` });
        }}
      />
      <span className="text-xs text-slate-500">
        {contar(total, "local", "locais")}
        {checklists > 0 && ` · ${contar(checklists, "checklist", "checklists")}`}
      </span>
      <ChaveAtivo ativo={l.ativo} rotulo={l.nome} onChange={(ativo) => gravar(supabase.from("gov_lugares").update({ ativo }).eq("id", l.id))} />
      {onClassificar || podeExcluir ? (
        <MenuAcoes rotulo={`Mais ações de ${l.nome}`}>
          {(fechar) => (
            <>
              {onClassificar && (
                <ItemMenu
                  onClick={() => {
                    fechar();
                    onClassificar();
                  }}
                >
                  Adicionar classificação
                </ItemMenu>
              )}
              {podeExcluir && (
                <ItemMenu
                  perigo
                  onClick={async () => {
                    fechar();
                    if (await ctx.confirmar({ titulo: `Excluir ${l.nome}?`, confirmar: "Excluir", perigo: true })) {
                      gravar(supabase.from("gov_lugares").delete().eq("id", l.id), {
                        "23503": `${l.nome} tem locais ou checklists ligados. Desative em vez de excluir.`,
                      });
                    }
                  }}
                >
                  Excluir
                </ItemMenu>
              )}
            </>
          )}
        </MenuAcoes>
      ) : (
        <span className="hidden sm:block" />
      )}
    </div>
  );
}

function CampoNome({ lugar: l, rotulo, escrita: { supabase, gravar } }: { lugar: Lugar; rotulo: string } & Contexto) {
  return (
    <label className="block min-w-0">
      <span className={labelCls}>{rotulo}</span>
      <input
        key={`${l.id}-${l.nome}`}
        defaultValue={l.nome}
        className={inputCls}
        onBlur={(e) => {
          const nome = limparNome(e.target.value);
          if (!nome) e.target.value = l.nome;
          else if (nome !== l.nome) gravar(supabase.from("gov_lugares").update({ nome }).eq("id", l.id), { "23505": `Já existe "${nome}" aqui.` });
        }}
      />
    </label>
  );
}

function BotaoExcluir({
  lugar: l,
  total,
  checklists,
  temFilhos,
  escrita: { supabase, gravar },
  confirmar,
}: { lugar: Lugar; total: number; checklists: number; temFilhos: boolean } & Contexto) {
  const pode = !temFilhos && total === 0 && checklists === 0;
  return (
    <button
      type="button"
      disabled={!pode}
      title={pode ? undefined : "Só dá para excluir sem tipos, locais e checklists. Se precisar, desative."}
      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      onClick={async () => {
        if (await confirmar({ titulo: `Excluir ${l.nome}?`, confirmar: "Excluir", perigo: true })) {
          gravar(supabase.from("gov_lugares").delete().eq("id", l.id), { "23503": `${l.nome} tem itens dentro. Desative em vez de excluir.` });
        }
      }}
    >
      Excluir categoria
    </button>
  );
}

function Pilula({ ligado, onClick, children }: { ligado: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ligado}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        ligado ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
      }`}
    >
      {ligado ? "✓ " : ""}
      {children}
    </button>
  );
}

function NovoLugar({
  pai,
  nivel,
  rotulo,
  exemplo,
  compacto = false,
  onFechar,
  unidade,
  escrita: { supabase, gravar },
}: {
  pai: Lugar | null;
  nivel: NivelLugar;
  rotulo: string;
  exemplo: string;
  compacto?: boolean;
  onFechar?: () => void;
} & Contexto) {
  const [nome, setNome] = useState("");

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo || !unidade) return;
    const ok = await gravar(
      supabase.from("gov_lugares").insert({ propriedade_id: unidade, parent_id: pai?.id ?? null, nivel, nome: limpo, ordem: 99 }),
      { "23505": `Já existe "${limpo}" aqui.` },
    );
    if (ok) {
      setNome("");
      onFechar?.();
    }
  }

  return (
    <form onSubmit={criar} className={`flex flex-col gap-2 sm:flex-row ${compacto ? "" : "sm:items-end"}`}>
      <label className="block min-w-0 flex-1">
        {rotulo && <span className={labelCls}>{rotulo}</span>}
        <input
          className={`${inputCls} ${compacto ? "py-1.5" : ""}`}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={exemplo}
          autoFocus={compacto}
        />
      </label>
      <div className="flex shrink-0 gap-2">
        <button type="submit" className={compacto ? btnPequeno : btnPrimario} disabled={!nome.trim()}>
          {nivel === "categoria" ? "+ Criar categoria" : nivel === "tipo" ? "+ Criar tipo" : "Criar"}
        </button>
        {onFechar && (
          <button type="button" className="text-xs text-slate-500 hover:text-slate-800" onClick={onFechar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
