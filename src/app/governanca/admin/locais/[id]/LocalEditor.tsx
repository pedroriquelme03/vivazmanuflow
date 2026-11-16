"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Acomodacao } from "@/lib/governanca";
import { limparNome, type PropriedadeRef, type SetorChecklist } from "@/lib/checklist-setores";
import {
  GRUPOS_ITEM,
  itensDoGrupo,
  tiposDoGrupo,
  type ItemLocal,
  type TipoItemPatrimonio,
} from "@/lib/checklist-patrimonio";
import { caminhoLugar, fichaDoLocal, tipoLegadoDoLocal, type Lugar } from "@/lib/checklist-lugares";
import { ativosOuAtual } from "@/lib/propriedade-opcoes";
import { useConfirmacao } from "@/components/Confirmacao";
import { EscolhaLugar } from "../../../Lugares";
import { SelectPropriedade } from "../../../Seletores";
import {
  ChaveAtivo,
  Erro,
  btnPequeno,
  btnPequenoPerigo,
  btnPrimario,
  cardCls,
  inputCls,
  labelCls,
} from "../../../ui";
import { useGravar } from "../../../useGravar";

/**
 * Ficha do local: onde fica na árvore, os dados (de UH, só em Hospedagem), quem cuida
 * (etiquetas de setor) e os itens dos grupos que a categoria pede.
 */
export function LocalEditor({
  local,
  itens,
  tipos,
  propriedades,
  lugares,
  setores,
  etiquetas,
}: {
  local: Acomodacao;
  itens: ItemLocal[];
  tipos: TipoItemPatrimonio[];
  propriedades: PropriedadeRef[];
  lugares: Lugar[];
  setores: SetorChecklist[];
  etiquetas: string[];
}) {
  const router = useRouter();
  const escrita = useGravar();
  const { supabase, erro, gravar } = escrita;
  const [confirmar, janela] = useConfirmacao();
  const ficha = fichaDoLocal(lugares, local.lugar_id);
  // Grupos da categoria, mais os que já têm itens (para nada sumir da tela).
  const grupos = GRUPOS_ITEM.filter(
    (g) => ficha.grupos.includes(g.valor) || itensDoGrupo(itens, tipos, g.valor).length > 0 || !local.lugar_id,
  );

  async function mudarAtivo(ativo: boolean) {
    if (
      !ativo &&
      !(await confirmar({
        titulo: `Desativar ${local.numero}?`,
        texto: "Ele deixa de aparecer na hora de preencher. O histórico continua.",
        confirmar: "Desativar",
      }))
    ) {
      return;
    }
    gravar(supabase.from("gov_acomodacoes").update({ ativo }).eq("id", local.id));
  }

  async function remover() {
    const ok = await confirmar({
      titulo: `Excluir ${local.numero}?`,
      texto: "O local e os itens dele são apagados. Se ele já tem checklists aplicados, não dá para excluir: desative.",
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    const apagou = await gravar(
      supabase.from("gov_acomodacoes").delete().eq("id", local.id),
      { "23503": `${local.numero} já tem checklists aplicados. Desative em vez de excluir.` },
      { recarregar: false },
    );
    if (apagou) router.replace("/governanca/admin/locais");
  }

  return (
    <>
      {janela}
      <Link href="/governanca/admin/locais" className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Locais
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-semibold uppercase tracking-wide text-slate-500">
            {caminhoLugar(lugares, local.lugar_id) || "Sem lugar na árvore"}
          </p>
          <h1 className="break-words text-2xl font-bold text-slate-800">{local.numero}</h1>
        </div>
        <ChaveAtivo ativo={local.ativo} onChange={mudarAtivo} rotulo={local.numero} />
      </div>

      <Erro texto={erro} />

      <DadosLocal
        local={local}
        propriedades={propriedades}
        lugares={lugares}
        onSalvar={(patch) =>
          gravar(supabase.from("gov_acomodacoes").update(patch).eq("id", local.id), {
            "23505": "Já existe um local com esse nome nessa unidade.",
          })
        }
      />

      <EtiquetasSetor
        localId={local.id}
        setores={setores.filter((s) => s.propriedade_id === local.propriedade_id && (s.ativo || etiquetas.includes(s.id)))}
        etiquetas={etiquetas}
        escrita={escrita}
      />

      {grupos.map((grupo) => (
        <SecaoItens
          key={grupo.valor}
          grupo={grupo}
          localId={local.id}
          itens={itensDoGrupo(itens, tipos, grupo.valor)}
          tipos={tipos}
          escrita={escrita}
          confirmar={confirmar}
        />
      ))}
      {grupos.length === 0 && (
        <p className={`${cardCls} mt-6 text-sm text-slate-500`}>
          A categoria deste local não pede itens. Dá para mudar em Locais › Categorias e tipos.
        </p>
      )}
      <p className="mt-2 text-right text-xs">
        <Link href="/governanca/admin/locais/tipos" className="font-medium text-brand-700 hover:underline">
          Renomear ou remover tipos de item →
        </Link>
      </p>

      <section className={`${cardCls} mt-6 border-red-100`}>
        <h2 className="text-sm font-semibold text-slate-800">Excluir local</h2>
        <p className="mt-1 text-sm text-slate-500">Só dá para excluir local que nunca foi usado em checklist.</p>
        <button type="button" className={`${btnPequenoPerigo} mt-3`} onClick={remover}>
          Excluir {local.numero}
        </button>
      </section>
    </>
  );
}

function DadosLocal({
  local,
  propriedades,
  lugares,
  onSalvar,
}: {
  local: Acomodacao;
  propriedades: PropriedadeRef[];
  lugares: Lugar[];
  onSalvar: (patch: Partial<Acomodacao>) => Promise<boolean>;
}) {
  const [numero, setNumero] = useState(local.numero);
  const [propriedadeId, setPropriedadeId] = useState(local.propriedade_id);
  const [lugarId, setLugarId] = useState(local.lugar_id ?? "");
  const [acomodacao, setAcomodacao] = useState(local.acomodacao ?? "");
  const [permitePet, setPermitePet] = useState(local.permite_pet);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const ficha = fichaDoLocal(lugares, lugarId || null);
  const lugar = lugares.find((l) => l.id === lugarId);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!limparNome(numero)) return;
    if (!lugar || lugar.nivel === "categoria") return setAviso("Escolha pelo menos o tipo de espaço.");
    setAviso(null);
    setSalvando(true);
    await onSalvar({
      numero: limparNome(numero),
      propriedade_id: propriedadeId,
      lugar_id: lugarId,
      tipo: tipoLegadoDoLocal(lugares, lugarId),
      // A classificação também fica no campo antigo, que outras telas ainda leem.
      categoria: lugar.nivel === "classificacao" ? lugar.nome.toUpperCase() : null,
      acomodacao: ficha.fichaUh ? limparNome(acomodacao).toUpperCase() || null : null,
      permite_pet: ficha.fichaUh && permitePet,
    });
    setSalvando(false);
  }

  return (
    <form onSubmit={salvar} className={`${cardCls} space-y-4`}>
      <h2 className="text-base font-semibold text-slate-800">Dados</h2>
      <label className="block max-w-md">
        <span className={labelCls}>Nome ou número</span>
        <input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block min-w-0">
          <span className={labelCls}>Unidade</span>
          <SelectPropriedade
            value={propriedadeId}
            onChange={(id) => {
              setPropriedadeId(id);
              setLugarId("");
            }}
            propriedades={ativosOuAtual(propriedades, local.propriedade_id)}
          />
        </label>
        <EscolhaLugar lugares={lugares} propriedadeId={propriedadeId} valor={lugarId} onChange={setLugarId} embutido />
      </div>
      {ficha.fichaUh && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Acomodação</span>
            <input
              className={inputCls}
              value={acomodacao}
              onChange={(e) => setAcomodacao(e.target.value)}
              placeholder="Ex.: CASAL + 2"
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input type="checkbox" checked={permitePet} onChange={(e) => setPermitePet(e.target.checked)} />
            Permite pet
          </label>
        </div>
      )}
      {aviso && <p className="text-sm font-medium text-red-600">{aviso}</p>}
      <button type="submit" className={btnPrimario} disabled={salvando}>
        Salvar dados
      </button>
    </form>
  );
}

/** Quem cuida do local: setores da unidade em botões que acendem (fora da árvore). */
function EtiquetasSetor({
  localId,
  setores,
  etiquetas,
  escrita: { supabase, gravar },
}: {
  localId: string;
  setores: SetorChecklist[];
  etiquetas: string[];
  escrita: ReturnType<typeof useGravar>;
}) {
  const [marcados, setMarcados] = useState(() => new Set(etiquetas));

  async function alternar(setorId: string) {
    const tem = marcados.has(setorId);
    const ok = await gravar(
      tem
        ? supabase.from("gov_local_setores").delete().eq("local_id", localId).eq("setor_id", setorId)
        : supabase.from("gov_local_setores").insert({ local_id: localId, setor_id: setorId }),
      {},
      { recarregar: false },
    );
    if (!ok) return;
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (tem) novo.delete(setorId);
      else novo.add(setorId);
      return novo;
    });
  }

  return (
    <section className={`${cardCls} mt-6`}>
      <h2 className="text-base font-semibold text-slate-800">Quem cuida</h2>
      <p className="mt-0.5 text-sm text-slate-500">Setores responsáveis por este local. Servem para filtrar; não mudam onde ele fica.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {setores.map((s) => {
          const ligado = marcados.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={ligado}
              onClick={() => alternar(s.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                ligado ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {ligado ? "✓ " : ""}
              {s.nome}
            </button>
          );
        })}
        {setores.length === 0 && <p className="text-sm text-slate-500">Nenhum setor nesta unidade.</p>}
      </div>
    </section>
  );
}

/**
 * Uma seção do patrimônio do local (Eletrônicos ou Mobília): cada item com tipo,
 * marca, modelo e número de patrimônio, que dá para editar ali mesmo.
 */
function SecaoItens({
  grupo,
  localId,
  itens,
  tipos,
  escrita: { supabase, gravar, setErro },
  confirmar,
}: {
  grupo: (typeof GRUPOS_ITEM)[number];
  localId: string;
  itens: ItemLocal[];
  tipos: TipoItemPatrimonio[];
  /** Mesma conexão e mesmo aviso de erro da página. */
  escrita: ReturnType<typeof useGravar>;
  confirmar: ReturnType<typeof useConfirmacao>[0];
}) {
  const [novoTipo, setNovoTipo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [patrimonio, setPatrimonio] = useState("");
  const [nomeTipo, setNomeTipo] = useState("");
  const nomeDoTipo = (id: string) => tipos.find((t) => t.id === id)?.nome ?? "Item";
  const patrimonioRepetido = (numero: string | null) => ({ "23505": `O patrimônio ${numero} já está em outro item.` });

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!novoTipo) return setErro(`Escolha o tipo do item em ${grupo.rotulo}.`);
    const numero = campoLivre(patrimonio);
    const ok = await gravar(
      supabase.from("gov_local_itens").insert({
        local_id: localId,
        tipo_item_id: novoTipo,
        marca: campoLivre(marca),
        modelo: campoLivre(modelo),
        patrimonio: numero,
      }),
      patrimonioRepetido(numero),
    );
    if (ok) {
      setMarca("");
      setModelo("");
      setPatrimonio("");
    }
  }

  function atualizar(item: ItemLocal, patch: Partial<ItemLocal>) {
    gravar(supabase.from("gov_local_itens").update(patch).eq("id", item.id), patrimonioRepetido(patch.patrimonio ?? null));
  }

  async function remover(item: ItemLocal) {
    const ok = await confirmar({
      titulo: `Remover ${nomeDoTipo(item.tipo_item_id)}?`,
      texto: [item.marca, item.modelo, item.patrimonio && `patrimônio ${item.patrimonio}`].filter(Boolean).join(" · ") || undefined,
      confirmar: "Remover",
      perigo: true,
    });
    if (ok) gravar(supabase.from("gov_local_itens").delete().eq("id", item.id));
  }

  async function criarTipo(e: React.FormEvent) {
    e.preventDefault();
    const nome = limparNome(nomeTipo);
    if (!nome) return;
    const ok = await gravar(supabase.from("gov_tipos_item").insert({ nome, grupo: grupo.valor }), {
      "23505": `O tipo "${nome}" já existe.`,
    });
    if (ok) setNomeTipo("");
  }

  const colunas = "grid gap-2 sm:grid-cols-2 lg:grid-cols-[11rem_1fr_1fr_9rem_auto] lg:items-center";

  return (
    <section className={`${cardCls} mt-6`}>
      <h2 className="text-base font-semibold text-slate-800">
        {grupo.rotulo} · {itens.length}
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        {grupo.exemplos} Uma pergunta do checklist pode conferir um tipo: na hora de responder aparece o que está aqui.
      </p>

      <ul className="mt-4 space-y-2">
        {itens.map((item) => (
          <li key={item.id} className={`${colunas} rounded-xl border border-slate-200 p-3`}>
            <select
              className={inputCls}
              value={item.tipo_item_id}
              aria-label="Tipo do item"
              onChange={(e) => atualizar(item, { tipo_item_id: e.target.value })}
            >
              {tiposDoGrupo(tipos, grupo.valor, item.tipo_item_id).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
            <CampoDoItem item={item} campo="marca" rotulo="Marca" onSalvar={(marca) => atualizar(item, { marca })} />
            <CampoDoItem
              item={item}
              campo="modelo"
              rotulo="Modelo / tamanho"
              onSalvar={(modelo) => atualizar(item, { modelo })}
            />
            <CampoDoItem
              item={item}
              campo="patrimonio"
              rotulo="Patrimônio"
              onSalvar={(patrimonio) => atualizar(item, { patrimonio })}
            />
            <button type="button" className={btnPequenoPerigo} onClick={() => remover(item)}>
              Remover
            </button>
          </li>
        ))}
        {itens.length === 0 && <li className="text-sm text-slate-500">Nada cadastrado em {grupo.rotulo}.</li>}
      </ul>

      <form onSubmit={adicionar} className={`${colunas} mt-4 rounded-xl bg-slate-50 p-3`}>
        <select
          className={inputCls}
          value={novoTipo}
          onChange={(e) => setNovoTipo(e.target.value)}
          aria-label={`Tipo do novo item em ${grupo.rotulo}`}
        >
          <option value="">Novo item…</option>
          {tiposDoGrupo(tipos, grupo.valor).map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <input className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca" aria-label="Marca do novo item" />
        <input className={inputCls} value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Modelo / tamanho" aria-label="Modelo do novo item" />
        <input
          className={inputCls}
          value={patrimonio}
          onChange={(e) => setPatrimonio(e.target.value)}
          placeholder="Patrimônio"
          aria-label="Patrimônio do novo item"
        />
        <button type="submit" className={btnPequeno}>
          + Adicionar
        </button>
      </form>

      <form onSubmit={criarTipo} className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        Falta um tipo em {grupo.rotulo}?
        <input
          className={`${inputCls} max-w-xs`}
          value={nomeTipo}
          onChange={(e) => setNomeTipo(e.target.value)}
          placeholder={grupo.novoTipo}
          aria-label={`Nome do novo tipo em ${grupo.rotulo}`}
        />
        <button type="submit" className={btnPequeno} disabled={!nomeTipo.trim()}>
          Criar tipo
        </button>
      </form>
    </section>
  );
}

/** Marca, modelo ou patrimônio do item: grava ao sair do campo, se mudou. */
function CampoDoItem({
  item,
  campo,
  rotulo,
  onSalvar,
}: {
  item: ItemLocal;
  campo: "marca" | "modelo" | "patrimonio";
  rotulo: string;
  onSalvar: (valor: string | null) => void;
}) {
  return (
    <input
      key={`${item.id}-${campo}-${item[campo]}`}
      className={inputCls}
      defaultValue={item[campo] ?? ""}
      placeholder={rotulo}
      aria-label={rotulo}
      onBlur={(e) => {
        const valor = campoLivre(e.target.value);
        if (valor !== item[campo]) onSalvar(valor);
      }}
    />
  );
}

/** Texto livre do item, sem espaços sobrando e em maiúsculas; vazio vira null. */
function campoLivre(valor: string) {
  return limparNome(valor).toUpperCase() || null;
}
