"use client";

import { useState } from "react";
import Link from "next/link";
import { limparNome } from "@/lib/checklist-setores";
import { codigoDoGrupo, grupoDoTipo, type GrupoItem, type TipoItemPatrimonio } from "@/lib/checklist-patrimonio";
import { useConfirmacao } from "@/components/Confirmacao";
import { ChaveAtivo, Erro, Titulo, btnPequeno, btnPequenoPerigo, btnPrimario, cardCls, inputCls, labelCls } from "../../../ui";
import { useGravar } from "../../../useGravar";

type TipoComUso = TipoItemPatrimonio & { itens: number; perguntas: number };

const contar = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Grupos de itens (Eletrônicos, Mobília, Máquinas...) e os tipos de cada um (TV,
 * Bomba...). O grupo vira uma seção na ficha do local; cada categoria escolhe os seus
 * em Locais › Categorias e tipos.
 */
export function TiposItem({
  tipos,
  grupos,
  faltaSqlGrupos,
}: {
  tipos: TipoComUso[];
  grupos: GrupoItem[];
  faltaSqlGrupos: boolean;
}) {
  const escrita = useGravar();
  const { supabase, erro, gravar } = escrita;
  const [confirmar, janela] = useConfirmacao();
  const [nomeGrupo, setNomeGrupo] = useState("");

  async function criarGrupo(e: React.FormEvent) {
    e.preventDefault();
    const nome = limparNome(nomeGrupo);
    if (!nome) return;
    const codigo = codigoDoGrupo(nome, grupos.map((g) => g.codigo));
    const ordem = Math.max(0, ...grupos.map((g) => g.ordem)) + 1;
    if (await gravar(supabase.from("gov_grupos_item").insert({ codigo, nome, ordem }), { "23505": `O grupo "${nome}" já existe.` })) {
      setNomeGrupo("");
    }
  }

  return (
    <>
      {janela}
      <Link href="/governanca/admin/locais" className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Locais
      </Link>
      <Titulo
        titulo="Grupos e tipos de item"
        subtitulo="Os itens dos locais ficam em grupos (Eletrônicos, Mobília, Máquinas…). Cada grupo vira uma seção na ficha do local, e cada categoria escolhe quais mostrar em Categorias e tipos."
      />
      {faltaSqlGrupos && (
        <Erro texto="Para criar e renomear grupos, rode no Supabase o SQL supabase/migrations/20261116130000_checklist_grupos_item.sql." />
      )}
      <Erro texto={erro} />

      <div className="space-y-4">
        {grupos.map((g) => (
          <CartaoGrupo
            key={g.codigo}
            grupo={g}
            tipos={tipos.filter((t) => grupoDoTipo(t, grupos) === g.codigo)}
            grupos={grupos}
            podeEditarGrupo={!faltaSqlGrupos}
            escrita={escrita}
            confirmar={confirmar}
          />
        ))}
      </div>

      {!faltaSqlGrupos && (
        <form onSubmit={criarGrupo} className={`${cardCls} mt-4 flex flex-col gap-3 sm:flex-row sm:items-end`}>
          <label className="block min-w-0 flex-1">
            <span className={labelCls}>Novo grupo</span>
            <input
              className={inputCls}
              value={nomeGrupo}
              onChange={(e) => setNomeGrupo(e.target.value)}
              placeholder="Ex.: Máquinas, Louças e metais, Segurança"
            />
          </label>
          <button type="submit" className={`${btnPrimario} shrink-0`} disabled={!nomeGrupo.trim()}>
            + Criar grupo
          </button>
        </form>
      )}
    </>
  );
}

function CartaoGrupo({
  grupo: g,
  tipos,
  grupos,
  podeEditarGrupo,
  escrita: { supabase, gravar },
  confirmar,
}: {
  grupo: GrupoItem;
  tipos: TipoComUso[];
  grupos: GrupoItem[];
  podeEditarGrupo: boolean;
  escrita: ReturnType<typeof useGravar>;
  confirmar: ReturnType<typeof useConfirmacao>[0];
}) {
  const [nomeTipo, setNomeTipo] = useState("");
  const itensNoGrupo = tipos.reduce((s, t) => s + t.itens, 0);

  async function criarTipo(e: React.FormEvent) {
    e.preventDefault();
    const nome = limparNome(nomeTipo);
    if (!nome) return;
    if (await gravar(supabase.from("gov_tipos_item").insert({ nome, grupo: g.codigo }), { "23505": `O tipo "${nome}" já existe.` })) {
      setNomeTipo("");
    }
  }

  async function excluirGrupo() {
    if (!(await confirmar({ titulo: `Excluir o grupo ${g.nome}?`, confirmar: "Excluir", perigo: true }))) return;
    gravar(supabase.from("gov_grupos_item").delete().eq("codigo", g.codigo), {
      "23503": `${g.nome} ainda tem tipos. Mude os tipos de grupo ou remova-os antes.`,
    });
  }

  async function removerTipo(tipo: TipoComUso) {
    const ok = await confirmar({
      titulo: `Remover o tipo ${tipo.nome}?`,
      texto: tipo.perguntas ? `${contar(tipo.perguntas, "pergunta deixa", "perguntas deixam")} de conferir este item.` : undefined,
      confirmar: "Remover",
      perigo: true,
    });
    if (!ok) return;
    gravar(supabase.from("gov_tipos_item").delete().eq("id", tipo.id), {
      "23503": `Ainda tem ${tipo.nome} cadastrado em algum local. Remova ou troque o tipo desses itens antes.`,
    });
  }

  return (
    <section className={`${cardCls} ${g.ativo ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          key={`${g.codigo}-${g.nome}`}
          defaultValue={g.nome}
          disabled={!podeEditarGrupo}
          aria-label={`Nome do grupo ${g.nome}`}
          className={`${inputCls} min-w-[10rem] flex-1 text-base font-semibold`}
          onBlur={(e) => {
            const nome = limparNome(e.target.value);
            if (!nome) e.target.value = g.nome;
            else if (nome !== g.nome) {
              gravar(supabase.from("gov_grupos_item").update({ nome }).eq("codigo", g.codigo), { "23505": `O grupo "${nome}" já existe.` });
            }
          }}
        />
        <span className="shrink-0 text-xs text-slate-500">
          {contar(tipos.length, "tipo", "tipos")} · {contar(itensNoGrupo, "item", "itens")}
        </span>
        {podeEditarGrupo && (
          <ChaveAtivo ativo={g.ativo} rotulo={g.nome} onChange={(ativo) => gravar(supabase.from("gov_grupos_item").update({ ativo }).eq("codigo", g.codigo))} />
        )}
        {podeEditarGrupo && tipos.length === 0 && (
          <button type="button" className={btnPequenoPerigo} onClick={excluirGrupo}>
            Excluir
          </button>
        )}
      </div>
      <input
        key={`${g.codigo}-ex-${g.exemplos}`}
        defaultValue={g.exemplos ?? ""}
        disabled={!podeEditarGrupo}
        placeholder="Exemplos que aparecem na ficha do local (opcional)"
        aria-label={`Exemplos do grupo ${g.nome}`}
        className={`${inputCls} mt-2 text-xs text-slate-600`}
        onBlur={(e) => {
          const exemplos = e.target.value.trim() || null;
          if (exemplos !== g.exemplos) gravar(supabase.from("gov_grupos_item").update({ exemplos }).eq("codigo", g.codigo));
        }}
      />

      <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {tipos.map((t) => (
          <li key={t.id} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[1fr_10rem_7.5rem_auto] sm:items-center">
            <input
              key={`${t.id}-${t.nome}`}
              className={inputCls}
              defaultValue={t.nome}
              aria-label={`Nome do tipo ${t.nome}`}
              onBlur={(e) => {
                const nome = limparNome(e.target.value);
                if (!nome) e.target.value = t.nome;
                else if (nome !== t.nome) {
                  gravar(supabase.from("gov_tipos_item").update({ nome }).eq("id", t.id), { "23505": `O tipo "${nome}" já existe.` });
                }
              }}
            />
            <select
              className={inputCls}
              value={g.codigo}
              aria-label={`Grupo de ${t.nome}`}
              onChange={(e) => gravar(supabase.from("gov_tipos_item").update({ grupo: e.target.value }).eq("id", t.id))}
            >
              {grupos.map((x) => (
                <option key={x.codigo} value={x.codigo}>
                  {x.nome}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              {contar(t.itens, "item", "itens")}
              {t.perguntas > 0 && ` · ${contar(t.perguntas, "pergunta", "perguntas")}`}
            </span>
            <button
              type="button"
              className={btnPequenoPerigo}
              onClick={() => removerTipo(t)}
              disabled={t.itens > 0}
              title={t.itens > 0 ? "Tem itens desse tipo nos locais: remova ou troque o tipo deles antes." : undefined}
            >
              Remover
            </button>
          </li>
        ))}
        {tipos.length === 0 && <li className="px-3 py-2.5 text-sm text-slate-500">Nenhum tipo neste grupo ainda.</li>}
      </ul>

      <form onSubmit={criarTipo} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className={`${inputCls} sm:max-w-sm`}
          value={nomeTipo}
          onChange={(e) => setNomeTipo(e.target.value)}
          placeholder={`Novo tipo em ${g.nome} (ex.: ${g.exemplos?.split(",")[0]?.trim() || "Aquecedor"})`}
          aria-label={`Novo tipo em ${g.nome}`}
        />
        <button type="submit" className={`${btnPequeno} shrink-0`} disabled={!nomeTipo.trim()}>
          + Criar tipo
        </button>
      </form>
    </section>
  );
}
