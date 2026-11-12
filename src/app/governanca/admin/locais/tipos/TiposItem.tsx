"use client";

import { useState } from "react";
import Link from "next/link";
import { limparNome } from "@/lib/checklist-setores";
import { GRUPOS_ITEM, grupoDoTipo, type GrupoItem, type TipoItemPatrimonio } from "@/lib/checklist-patrimonio";
import { useConfirmacao } from "@/components/Confirmacao";
import { Erro, Titulo, btnPequeno, btnPequenoPerigo, cardCls, inputCls } from "../../../ui";
import { useGravar } from "../../../useGravar";

type TipoComUso = TipoItemPatrimonio & { itens: number; perguntas: number };

const contar = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Tipos de item dos locais (TV, Cama...): criar, renomear, trocar de seção e remover. */
export function TiposItem({ tipos }: { tipos: TipoComUso[] }) {
  const { supabase, erro, gravar } = useGravar();
  const [confirmar, janela] = useConfirmacao();
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<GrupoItem>("eletronico");
  const jaExiste = (n: string) => ({ "23505": `O tipo "${n}" já existe.` });

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo) return;
    if (await gravar(supabase.from("gov_tipos_item").insert({ nome: limpo, grupo }), jaExiste(limpo))) setNome("");
  }

  function atualizar(tipo: TipoComUso, patch: { nome?: string; grupo?: GrupoItem }) {
    gravar(supabase.from("gov_tipos_item").update(patch).eq("id", tipo.id), jaExiste(patch.nome ?? tipo.nome));
  }

  async function remover(tipo: TipoComUso) {
    const ok = await confirmar({
      titulo: `Remover o tipo ${tipo.nome}?`,
      texto: tipo.perguntas
        ? `${contar(tipo.perguntas, "pergunta deixa", "perguntas deixam")} de conferir este item.`
        : undefined,
      confirmar: "Remover",
      perigo: true,
    });
    if (!ok) return;
    gravar(supabase.from("gov_tipos_item").delete().eq("id", tipo.id), {
      "23503": `Ainda tem ${tipo.nome} cadastrado em algum local. Remova ou troque o tipo desses itens antes.`,
    });
  }

  return (
    <>
      {janela}
      <Link href="/governanca/admin/locais" className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Locais
      </Link>
      <Titulo
        titulo="Tipos de item"
        subtitulo="Os tipos que aparecem nos itens das UHs e áreas. Renomear aqui muda em todos os locais."
      />
      <Erro texto={erro} />

      <form onSubmit={adicionar} className={`${cardCls} mb-6 grid gap-2 sm:grid-cols-[1fr_11rem_auto] sm:items-center`}>
        <input
          className={inputCls}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Novo tipo (ex.: Cama box)"
          aria-label="Nome do novo tipo"
        />
        <SelectGrupo value={grupo} onChange={setGrupo} rotulo="Seção do novo tipo" />
        <button type="submit" className={btnPequeno} disabled={!nome.trim()}>
          + Adicionar
        </button>
      </form>

      {GRUPOS_ITEM.map((g) => {
        const doGrupo = tipos.filter((t) => grupoDoTipo(t) === g.valor);
        return (
          <section key={g.valor} className={`${cardCls} mb-6`}>
            <h2 className="text-base font-semibold text-slate-800">
              {g.rotulo} · {doGrupo.length}
            </h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {doGrupo.map((t) => (
                <li key={t.id} className="grid gap-2 py-2.5 sm:grid-cols-[1fr_11rem_8rem_auto] sm:items-center">
                  <input
                    key={`${t.id}-${t.nome}`}
                    className={inputCls}
                    defaultValue={t.nome}
                    aria-label={`Nome do tipo ${t.nome}`}
                    onBlur={(e) => {
                      const limpo = limparNome(e.target.value);
                      if (!limpo) e.target.value = t.nome;
                      else if (limpo !== t.nome) atualizar(t, { nome: limpo });
                    }}
                  />
                  <SelectGrupo value={grupoDoTipo(t)} onChange={(novo) => atualizar(t, { grupo: novo })} rotulo={`Seção de ${t.nome}`} />
                  <span className="text-xs text-slate-500">
                    {contar(t.itens, "item", "itens")}
                    {t.perguntas > 0 && ` · ${contar(t.perguntas, "pergunta", "perguntas")}`}
                  </span>
                  <button
                    type="button"
                    className={btnPequenoPerigo}
                    onClick={() => remover(t)}
                    disabled={t.itens > 0}
                    title={t.itens > 0 ? "Tem itens desse tipo nos locais: remova ou troque o tipo deles antes." : undefined}
                  >
                    Remover
                  </button>
                </li>
              ))}
              {doGrupo.length === 0 && <li className="py-2.5 text-sm text-slate-500">Nenhum tipo em {g.rotulo}.</li>}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function SelectGrupo({
  value,
  onChange,
  rotulo,
}: {
  value: GrupoItem;
  onChange: (grupo: GrupoItem) => void;
  rotulo: string;
}) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as GrupoItem)} aria-label={rotulo}>
      {GRUPOS_ITEM.map((g) => (
        <option key={g.valor} value={g.valor}>
          {g.rotulo}
        </option>
      ))}
    </select>
  );
}
