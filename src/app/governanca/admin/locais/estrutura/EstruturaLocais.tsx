"use client";

import { useState } from "react";
import { limparNome, type PropriedadeRef } from "@/lib/checklist-setores";
import { descendentes, filhos, nivelFilho, rotuloNivel, type Lugar, type NivelLugar } from "@/lib/checklist-lugares";
import { GRUPOS_ITEM, type GrupoItem } from "@/lib/checklist-patrimonio";
import { useConfirmacao } from "@/components/Confirmacao";
import { Chave, ChaveAtivo, Erro, Titulo, Voltar, btnPequeno, btnPequenoPerigo, cardCls, inputCls } from "../../../ui";
import { useGravar } from "../../../useGravar";

type Contagem = Record<string, number>;

/**
 * Categorias, tipos de espaço e classificações de cada unidade. A categoria diz o
 * que a ficha dos locais mostra (dados da UH e grupos de itens).
 */
export function EstruturaLocais({
  lugares,
  propriedades,
  locaisPorLugar,
  checklistsPorLugar,
  faltaSql,
}: {
  lugares: Lugar[];
  propriedades: PropriedadeRef[];
  locaisPorLugar: Contagem;
  checklistsPorLugar: Contagem;
  faltaSql: boolean;
}) {
  const escrita = useGravar();
  const { erro } = escrita;
  const [confirmar, janela] = useConfirmacao();
  const [unidade, setUnidade] = useState(propriedades[0]?.id ?? "");
  const categorias = filhos(lugares, null, unidade, false);
  const contexto = { lugares, locaisPorLugar, checklistsPorLugar, escrita, confirmar, unidade };

  return (
    <>
      {janela}
      <Voltar href="/governanca/admin/locais">Locais</Voltar>
      <Titulo
        titulo="Categorias e tipos"
        subtitulo="A árvore de cada unidade: Categoria → Tipo de espaço → Classificação. Os locais (UH 1000, Casa de Máquinas 1...) ficam num tipo ou numa classificação."
      />
      {faltaSql && <Erro texto="Rode no Supabase o SQL supabase/migrations/20261116120000_checklist_locais_arvore.sql." />}
      <Erro texto={erro} />

      <div className="mb-4 inline-flex overflow-hidden rounded-xl border border-slate-300 text-sm font-semibold">
        {propriedades.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={unidade === p.id}
            onClick={() => setUnidade(p.id)}
            className={`px-4 py-2 ${unidade === p.id ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {p.nome}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {categorias.map((c) => (
          <Categoria key={c.id} categoria={c} {...contexto} />
        ))}
        {categorias.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria nesta unidade.</p>}
      </div>

      <div className={`${cardCls} mt-4`}>
        <NovoFilho pai={null} nivel="categoria" {...contexto} />
      </div>
    </>
  );
}

type Contexto = {
  lugares: Lugar[];
  locaisPorLugar: Contagem;
  checklistsPorLugar: Contagem;
  escrita: ReturnType<typeof useGravar>;
  confirmar: ReturnType<typeof useConfirmacao>[0];
  unidade: string;
};

function Categoria({ categoria: c, ...ctx }: { categoria: Lugar } & Contexto) {
  const { supabase, gravar } = ctx.escrita;
  const tipos = filhos(ctx.lugares, c.id, null, false);
  const totalLocais = [...descendentes(ctx.lugares, c.id)].reduce((s, id) => s + (ctx.locaisPorLugar[id] ?? 0), 0);

  function mudarGrupo(grupo: GrupoItem, ligado: boolean) {
    const grupos = ligado ? [...new Set([...c.grupos, grupo])] : c.grupos.filter((g) => g !== grupo);
    gravar(supabase.from("gov_lugares").update({ grupos }).eq("id", c.id));
  }

  return (
    <section className={`${cardCls} ${c.ativo ? "" : "opacity-60"}`}>
      <LinhaLugar lugar={c} destaque total={totalLocais} {...ctx} />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-slate-50 px-3 py-2.5">
        <span className="text-xs font-semibold text-slate-500">A ficha dos locais mostra:</span>
        <Chave ligado={c.ficha_uh} onChange={(v) => gravar(supabase.from("gov_lugares").update({ ficha_uh: v }).eq("id", c.id))}>
          Dados da UH
        </Chave>
        {GRUPOS_ITEM.map((g) => (
          <Chave key={g.valor} ligado={c.grupos.includes(g.valor)} onChange={(v) => mudarGrupo(g.valor, v)}>
            {g.rotulo}
          </Chave>
        ))}
      </div>
      <ul className="mt-3 space-y-2 border-l-2 border-slate-100 pl-3 sm:pl-4">
        {tipos.map((t) => (
          <li key={t.id}>
            <LinhaLugar lugar={t} total={ctx.locaisPorLugar[t.id] ?? 0} {...ctx} />
            <ul className="mt-1.5 space-y-1.5 border-l-2 border-slate-100 pl-3 sm:pl-4">
              {filhos(ctx.lugares, t.id, null, false).map((cl) => (
                <li key={cl.id}>
                  <LinhaLugar lugar={cl} total={ctx.locaisPorLugar[cl.id] ?? 0} {...ctx} />
                </li>
              ))}
              <li>
                <NovoFilho pai={t} nivel="classificacao" {...ctx} compacto />
              </li>
            </ul>
          </li>
        ))}
        <li>
          <NovoFilho pai={c} nivel="tipo" {...ctx} compacto />
        </li>
      </ul>
    </section>
  );
}

/** Nome (renomeia ao sair do campo), quantos locais e checklists, ativo e excluir. */
function LinhaLugar({
  lugar: l,
  total,
  destaque = false,
  lugares,
  checklistsPorLugar,
  escrita: { supabase, gravar },
  confirmar,
}: { lugar: Lugar; total: number; destaque?: boolean } & Contexto) {
  const temFilhos = lugares.some((x) => x.parent_id === l.id);
  const checklists = checklistsPorLugar[l.id] ?? 0;

  async function excluir() {
    const ok = await confirmar({
      titulo: `Excluir ${l.nome}?`,
      texto: "Só dá para excluir o que não tem nada dentro, nenhum local e nenhum checklist ligado. Se tiver, desative.",
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    gravar(supabase.from("gov_lugares").delete().eq("id", l.id), {
      "23503": `${l.nome} tem locais, itens dentro ou checklists ligados. Desative em vez de excluir.`,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        key={`${l.id}-${l.nome}`}
        defaultValue={l.nome}
        aria-label={`${rotuloNivel(l.nivel)} ${l.nome}`}
        className={`${inputCls} min-w-[10rem] flex-1 ${destaque ? "text-base font-semibold" : ""}`}
        onBlur={(e) => {
          const limpo = limparNome(e.target.value);
          if (!limpo) e.target.value = l.nome;
          else if (limpo !== l.nome) {
            gravar(supabase.from("gov_lugares").update({ nome: limpo }).eq("id", l.id), {
              "23505": `Já existe "${limpo}" aqui.`,
            });
          }
        }}
      />
      <span className="shrink-0 text-xs text-slate-500">
        {total} {total === 1 ? "local" : "locais"}
        {checklists > 0 && ` · ${checklists} ${checklists === 1 ? "checklist" : "checklists"}`}
      </span>
      <ChaveAtivo
        ativo={l.ativo}
        rotulo={l.nome}
        onChange={(ativo) => gravar(supabase.from("gov_lugares").update({ ativo }).eq("id", l.id))}
      />
      {!temFilhos && total === 0 && checklists === 0 && (
        <button type="button" className={btnPequenoPerigo} onClick={excluir}>
          Excluir
        </button>
      )}
    </div>
  );
}

function NovoFilho({
  pai,
  nivel,
  compacto = false,
  unidade,
  escrita: { supabase, gravar },
}: { pai: Lugar | null; nivel: NivelLugar; compacto?: boolean } & Contexto) {
  const [nome, setNome] = useState("");
  const [aberto, setAberto] = useState(!compacto);
  if (!nivelFilho(pai?.nivel ?? null)) return null;

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo || !unidade) return;
    const ok = await gravar(
      supabase.from("gov_lugares").insert({ propriedade_id: unidade, parent_id: pai?.id ?? null, nivel, nome: limpo, ordem: 99 }),
      { "23505": `Já existe "${limpo}" aqui.` },
    );
    if (ok) setNome("");
  }

  if (!aberto) {
    return (
      <button type="button" className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => setAberto(true)}>
        + {rotuloNivel(nivel)}
      </button>
    );
  }
  return (
    <form onSubmit={criar} className="flex flex-wrap items-center gap-2">
      <input
        className={`${inputCls} max-w-xs`}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder={`Nova ${rotuloNivel(nivel).toLowerCase()}${pai ? ` em ${pai.nome}` : ""}`}
        autoFocus={compacto}
      />
      <button type="submit" className={btnPequeno} disabled={!nome.trim()}>
        Criar
      </button>
      {compacto && (
        <button type="button" className="text-xs text-slate-500 hover:text-slate-800" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      )}
    </form>
  );
}
