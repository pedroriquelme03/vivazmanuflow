"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import {
  BUCKET_GOVERNANCA,
  MIGRATION_HINT_GOV,
  agruparPorGrupo,
  corNota,
  erroSchemaGov,
  filtrarAcomodacoes,
  ordenarSecoes,
  rotuloTipo,
  secaoCompleta,
  secaoParaRetomar,
  temItemVisivel,
  tipoItem,
  type Acomodacao,
  type Camareira,
  type Prioridade,
  type Processo,
  type SecaoComPerguntas,
} from "@/lib/governanca";
import type { PropriedadeRef, SetorChecklist } from "@/lib/checklist-setores";
import { formatarDataCurta } from "@/lib/checklist-inspecao";
import { notaPonderada, ocultos, textoDaResposta, type Dependencia } from "@/lib/checklist-regras";
import { previstoNoLocal, type ItemLocal, type TipoItemPatrimonio } from "@/lib/checklist-patrimonio";
import { compararNumeroUh } from "@/lib/mapa-uhs";
import { passoAvaliado } from "@/lib/checklist-avaliado";
import { caminhoLugar, localNoChecklist, rotuloOndeChecklist, type Lugar } from "@/lib/checklist-lugares";
import { extrasDoBanco, extrasParaGravar, lerCamposPlano } from "@/lib/checklist-plano";
import { EscolhaChecklist } from "./EscolhaChecklist";
import { PassoDados } from "./PassoDados";
import { PerguntaItem, respostaVazia, type RespostaLocal } from "./PerguntaItem";
import { Erro, Vazio, btnPrimario, btnSecundario, cardCls, inputCls } from "../ui";

type Fase = "processo" | "acomodacao" | "dados" | "perguntas" | "salvando" | "concluido";
type ProcessoResumo = Processo & { itens: number };
type ProcessoCompleto = ProcessoResumo & { secoes: SecaoComPerguntas[]; dependencias: Dependencia[] };

const NADA_ESCONDIDO = { perguntas: new Set<string>(), secoes: new Set<string>() };

/** Pergunta → tipo e seção, para as condicionais. */
function mapaPerguntas(secoes: SecaoComPerguntas[]) {
  return new Map(secoes.flatMap((s) => s.gov_perguntas.map((q) => [q.id, { tipo: q.tipo, secao_id: s.id }] as const)));
}

/** Checklist em andamento (ou pausado) que a pessoa reabriu para continuar. */
export type RascunhoInspecao = {
  id: string;
  processoId: string;
  acomodacaoId: string | null;
  camareiraId: string | null;
  dataReferencia: string;
  respostas: {
    pergunta_id: string | null;
    resposta: string | null;
    valor: string | null;
    comentario: string | null;
    anexo_url: string | null;
    item_diferente: boolean;
    item_encontrado: string | null;
    plano: {
      prioridade: string;
      o_que_fazer: string;
      quem_vai_fazer: string | null;
      quem_pediu: string | null;
      prazo?: string | null;
      onde?: string | null;
      por_que?: string | null;
      como?: string | null;
      custo?: number | null;
    } | null;
  }[];
};

const PREFIXOS_ANDAR = ["10", "11", "12"] as const;

/** UH que veio no relatório diário de hoje (Suja ou com Limpeza agendada). */
export type UhDoRelatorio = { numero: string; tarefa: string; feita: boolean };

function respostaDoRascunho(r: RascunhoInspecao["respostas"][number]): RespostaLocal {
  const base = respostaVazia();
  let selecionadas: string[] = [];
  if (r.valor?.startsWith("[")) {
    try {
      const lista = JSON.parse(r.valor);
      if (Array.isArray(lista)) selecionadas = lista.map(String);
    } catch {
      selecionadas = [];
    }
  }
  return {
    ...base,
    resposta: r.resposta === "sim" || r.resposta === "nao" || r.resposta === "na" ? r.resposta : null,
    valor: selecionadas.length ? "" : (r.valor ?? ""),
    selecionadas,
    comentario: r.comentario ?? "",
    mostrarComentario: Boolean(r.comentario),
    anexoPreview: r.anexo_url,
    itemDiferente: r.item_diferente,
    itemEncontrado: r.item_encontrado ?? "",
    plano: r.plano
      ? {
          prioridade: (["baixa", "media", "alta"].includes(r.plano.prioridade)
            ? r.plano.prioridade
            : "media") as Prioridade,
          o_que_fazer: r.plano.o_que_fazer,
          quem_vai_fazer: r.plano.quem_vai_fazer ?? "",
          quem_pediu: r.plano.quem_pediu ?? "",
          extras: extrasDoBanco(r.plano),
        }
      : null,
  };
}

export function NovaInspecao({
  eu,
  equipe,
  acomodacoes,
  camareiras,
  processos,
  setores,
  propriedades,
  rascunho,
  hoje,
  tiposItem,
  relatorioDoDia = [],
  dataRelatorio = null,
  lugares = [],
  ligacoes = {},
}: {
  /** Árvore de locais e onde cada checklist se aplica. */
  lugares?: Lugar[];
  ligacoes?: Record<string, string[]>;
  /** Hoje (aaaa-mm-dd, Brasília), calculado no servidor. */
  hoje: string;
  /** Tipos de item do patrimônio (TV, ar...), para conferir na UH. */
  tiposItem: TipoItemPatrimonio[];
  relatorioDoDia?: UhDoRelatorio[];
  /** Data (aaaa-mm-dd) do relatório usado, quando não é o de hoje. */
  dataRelatorio?: string | null;
  eu: { id: string; nome: string };
  /** Líder ou admin: escolhe o colaborador avaliado e pode criar checklists. */
  equipe: boolean;
  acomodacoes: Acomodacao[];
  /** Colaboradores (tabela gov_camareiras). */
  camareiras: Camareira[];
  processos: ProcessoResumo[];
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  rascunho?: RascunhoInspecao | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const topo = useRef<HTMLDivElement>(null);

  const [fase, setFase] = useState<Fase>("processo");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const [processo, setProcesso] = useState<ProcessoCompleto | null>(null);
  const [acomodacao, setAcomodacao] = useState<Acomodacao | null>(null);
  const [camareira, setCamareira] = useState<Camareira | null>(null);
  // Colaborador do rascunho que a pessoa não enxerga (outro setor): mantido ao salvar.
  const [camareiraOculta, setCamareiraOculta] = useState<string | null>(null);
  const [dataReferencia, setDataReferencia] = useState(rascunho?.dataReferencia ?? hoje);
  // "Para mim" ou "para outra pessoa", quando o checklist pergunta no começo.
  const [paraMim, setParaMim] = useState<boolean | null>(null);
  const [iniciando, setIniciando] = useState(false);
  // Itens do local escolhido (TV, ar...), para as perguntas que conferem item.
  const [itensDoLocal, setItensDoLocal] = useState<ItemLocal[]>([]);

  const [secaoIndex, setSecaoIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, RespostaLocal>>({});

  const [inspecaoId, setInspecaoId] = useState<string | null>(rascunho?.id ?? null);
  const [salvandoSecao, setSalvandoSecao] = useState(false);
  const criando = useRef<Promise<string> | null>(null);
  const [inspecaoIdFinal, setInspecaoIdFinal] = useState<string | null>(null);
  const [chamadosAbertos, setChamadosAbertos] = useState<{ abertos: number; total: number } | null>(null);
  const [busca, setBusca] = useState("");
  const [prefixoAndar, setPrefixoAndar] = useState<string | null>(null);

  const comItens = useMemo(() => processos.filter((p) => p.itens > 0), [processos]);

  const secoes = processo?.secoes ?? [];
  // Condicionais: o que a resposta atual esconde (pergunta ou seção inteira).
  const escondidos = useMemo(
    () => (processo ? ocultos(processo.dependencias, respostas, mapaPerguntas(processo.secoes)) : NADA_ESCONDIDO),
    [processo, respostas],
  );
  const perguntasVisiveis = secoes.flatMap((s) =>
    escondidos.secoes.has(s.id) ? [] : s.gov_perguntas.filter((q) => !escondidos.perguntas.has(q.id)),
  );

  // Nota da vistoria: Sim/Não visíveis, cada um com o seu peso.
  const contagemFinal = perguntasVisiveis.reduce(
    (c, q) => {
      if (respostas[q.id]?.resposta === "sim") c.sim += 1;
      if (respostas[q.id]?.resposta === "nao") c.nao += 1;
      return c;
    },
    { sim: 0, nao: 0 },
  );
  const notaFinal = notaPonderada(
    perguntasVisiveis.map((q) => ({ resposta: respostas[q.id]?.resposta ?? null, peso: Number(q.peso) })),
  );

  const secaoAtual = secoes[secaoIndex];
  // Locais da propriedade do checklist: as áreas, ou as UHs do tipo dele.
  const propriedadeDoProcesso = setores.find((s) => s.id === processo?.setor_id)?.propriedade_id;
  const acomodacoesDoProcesso = processo
    ? acomodacoes.filter(
        (a) => a.propriedade_id === propriedadeDoProcesso && localNoChecklist(a, processo, ligacoes[processo.id] ?? [], lugares),
      )
    : [];
  // Sem nenhuma UH na lista: é local de outra categoria (casa de máquinas, piscina...).
  const ehArea = processo ? !acomodacoesDoProcesso.some((a) => a.tipo === "suite" || a.tipo === "apartamento") : false;
  // Locais que não são UH aparecem agrupados pelo caminho na árvore.
  const gruposDeLocais = (lista: Acomodacao[]) =>
    [...lista.reduce((mapa, a) => {
      const chave = caminhoLugar(lugares, a.lugar_id) || "Outros locais";
      return mapa.set(chave, [...(mapa.get(chave) ?? []), a]);
    }, new Map<string, Acomodacao[]>())].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  const filtradas = filtrarAcomodacoes(acomodacoesDoProcesso, busca, ehArea ? null : prefixoAndar);
  // As do relatório de hoje vêm primeiro (do menor para o maior número); as outras continuam abaixo.
  const relatorioPorNumero = new Map(relatorioDoDia.map((u) => [u.numero, u]));
  const filtradasDoRelatorio = filtradas
    .filter((a) => relatorioPorNumero.has(a.numero))
    .sort((a, b) => compararNumeroUh(a.numero, b.numero));
  const filtradasOutras = filtradas.filter((a) => !relatorioPorNumero.has(a.numero));
  const completa = secaoAtual ? secaoCompleta(secaoAtual.gov_perguntas, respostas, escondidos.perguntas) : false;
  // Só os colaboradores do setor do checklist (o banco também confere ao salvar).
  const colaboradores = camareiras.filter((c) => c.setor_id === processo?.setor_id);
  // Como o avaliado é escolhido neste checklist, para quem está preenchendo.
  const passo = passoAvaliado(processo?.avaliado, equipe);
  const nomesCamareiras = colaboradores.map((c) => c.nome);
  const usaUh = processo?.usa_acomodacao ?? false;

  function subir() {
    topo.current?.scrollIntoView({ block: "start" });
  }

  async function carregarProcesso(resumo: ProcessoResumo) {
    setErro(null);
    setCarregando(true);
    const { data, error } = await supabase
      .from("gov_secoes")
      .select("*, gov_perguntas(*)")
      .eq("processo_id", resumo.id);
    const secoes = ordenarSecoes((data ?? []) as SecaoComPerguntas[]);
    const ids = secoes.flatMap((s) => s.gov_perguntas.map((q) => q.id));
    const { data: dependencias, error: eDep } = ids.length
      ? await supabase.from("gov_dependencias").select("*").in("pergunta_id", ids)
      : { data: [], error: null };
    setCarregando(false);
    if (error || eDep) {
      setErro("Não foi possível abrir o checklist. Tente de novo.");
      return null;
    }
    const p: ProcessoCompleto = { ...resumo, secoes, dependencias: dependencias ?? [] };
    if (!p.secoes.some((s) => s.gov_perguntas.length > 0)) {
      setErro("Este checklist ainda não tem perguntas.");
      return null;
    }
    return p;
  }

  // Continua de onde parou: mesmo checklist, UH, camareira e respostas já salvas.
  const retomado = useRef(false);
  useEffect(() => {
    if (!rascunho || retomado.current) return;
    retomado.current = true;
    void (async () => {
      const resumo = processos.find((p) => p.id === rascunho.processoId);
      if (!resumo) {
        setErro("O checklist em andamento não está mais disponível.");
        return;
      }
      const p = await carregarProcesso(resumo);
      if (!p) return;
      const salvas = new Map(
        rascunho.respostas
          .filter((r) => r.pergunta_id)
          .map((r) => [r.pergunta_id as string, respostaDoRascunho(r)]),
      );
      const init: Record<string, RespostaLocal> = {};
      p.secoes.forEach((s) =>
        s.gov_perguntas.forEach((q) => (init[q.id] = salvas.get(q.id) ?? respostaVazia())),
      );
      setProcesso(p);
      setAcomodacao(acomodacoes.find((a) => a.id === rascunho.acomodacaoId) ?? null);
      void carregarItens(rascunho.acomodacaoId);
      const doRascunho = camareiras.find((c) => c.id === rascunho.camareiraId) ?? null;
      setCamareira(doRascunho);
      setCamareiraOculta(doRascunho ? null : rascunho.camareiraId);
      setRespostas(init);
      setSecaoIndex(secaoParaRetomar(p.secoes, init, ocultos(p.dependencias, init, mapaPerguntas(p.secoes))));
      setFase("perguntas");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rascunho]);

  async function escolherProcesso(resumo: ProcessoResumo) {
    const p = await carregarProcesso(resumo);
    if (!p) return;
    // Trocou de checklist antes de responder: o rascunho anterior não serve mais.
    if (inspecaoId && processo?.id !== p.id) {
      await supabase.from("gov_inspecoes").delete().eq("id", inspecaoId).eq("status", "em_andamento");
    }
    if (processo?.id !== p.id) {
      setInspecaoId(null);
      criando.current = null;
    }
    setProcesso(p);
    setAcomodacao(null);
    setCamareira(null);
    setCamareiraOculta(null);
    setParaMim(null);
    const init: Record<string, RespostaLocal> = {};
    p.secoes.forEach((s) => s.gov_perguntas.forEach((q) => (init[q.id] = respostaVazia())));
    setRespostas(init);
    const inicio = ocultos(p.dependencias, init, mapaPerguntas(p.secoes));
    setSecaoIndex(Math.max(0, p.secoes.findIndex((s) => temItemVisivel(s, inicio))));
    setFase(p.usa_acomodacao ? "acomodacao" : "dados");
    subir();
  }

  async function carregarItens(localId: string | null) {
    if (!localId) return setItensDoLocal([]);
    const { data } = await supabase.from("gov_local_itens").select("*").eq("local_id", localId);
    setItensDoLocal(data ?? []);
  }

  /** O que a pergunta confere no local: o tipo (ex.: TV) e o que está cadastrado. */
  function conferenciaDe(q: { tipo_item_id: string | null }) {
    const tipo = tiposItem.find((t) => t.id === q.tipo_item_id);
    if (!tipo || !acomodacao) return null;
    return { tipo: tipo.nome, previsto: previstoNoLocal(itensDoLocal, acomodacao.id, tipo.id) };
  }

  /** Antes das perguntas: se o checklist é para quem aplica, usa o colaborador da conta dele. */
  async function comecar() {
    const paraSiMesmo = passo === "proprio" || (passo === "pergunta" && paraMim === true);
    // Já tem avaliado (rascunho retomado ou já buscado): mantém, para não trocar a pessoa.
    if (paraSiMesmo && processo && !camareira && !camareiraOculta) {
      setIniciando(true);
      const { data: id, error } = await supabase.rpc("gov_meu_colaborador_no_checklist", { p_processo_id: processo.id });
      setIniciando(false);
      if (error || !id) {
        setErro(
          erroSchemaGov(error?.message ?? "", error?.code)
            ? "Rode no Supabase o SQL 20261112220000_checklist_avaliado.sql para aplicar o checklist para você mesmo."
            : (error?.message ?? "Não deu para abrir o checklist no seu nome."),
        );
        return;
      }
      setCamareira({
        id,
        nome: eu.nome,
        setor_id: processo.setor_id,
        ativo: true,
        criado_em: new Date().toISOString(),
        usuario_id: eu.id,
      });
      setCamareiraOculta(null);
    }
    setErro(null);
    setFase("perguntas");
    subir();
  }

  function escolherAcomodacao(a: Acomodacao) {
    setAcomodacao(a);
    void carregarItens(a.id);
    setErro(null);
    setFase("dados");
  }

  async function irParaSecao(delta: 1 | -1) {
    let i = secaoIndex + delta;
    while (i >= 0 && i < secoes.length && !temItemVisivel(secoes[i], escondidos)) i += delta;
    if (i < 0) return;
    if (delta === 1 && secaoAtual) {
      const salvou = await salvarSecao(secaoAtual);
      if (!salvou) return;
    }
    if (i >= secoes.length) return finalizar();
    setSecaoIndex(i);
    subir();
  }

  const ultimaSecao = !secoes.slice(secaoIndex + 1).some((s) => temItemVisivel(s, escondidos));
  const temAnterior = secoes.slice(0, secaoIndex).some((s) => temItemVisivel(s, escondidos));

  function voltar() {
    setErro(null);
    if (fase === "perguntas" && temAnterior) return irParaSecao(-1);
    if (fase === "perguntas") return setFase("dados");
    if (fase === "dados" && usaUh) return setFase("acomodacao");
    setFase("processo");
  }

  async function enviarFoto(inspecaoId: string, perguntaId: string, arquivo: File) {
    const foto = await comprimirImagem(arquivo);
    const ext = foto.type === "image/jpeg" ? "jpg" : foto.name.split(".").pop() || "jpg";
    const caminho = `${inspecaoId}/${perguntaId}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET_GOVERNANCA)
      .upload(caminho, await foto.arrayBuffer(), {
        contentType: foto.type || "image/jpeg",
        upsert: true,
      });
    if (error) return null;
    return supabase.storage.from(BUCKET_GOVERNANCA).getPublicUrl(caminho).data.publicUrl;
  }

  /** Resposta da pergunta que identifica o checklist (ex.: o nome do evento). */
  function identificacao() {
    const id = processo?.identificador_pergunta_id;
    const q = id ? secoes.flatMap((s) => s.gov_perguntas).find((p) => p.id === id) : undefined;
    return q ? textoDaResposta(tipoItem(q.tipo), respostas[q.id]) : null;
  }

  function cabecalho() {
    return {
      acomodacao_id: acomodacao?.id ?? null,
      // O tipo da inspeção é só de UH; área não tem.
      tipo: acomodacao?.tipo === "suite" || acomodacao?.tipo === "apartamento" ? acomodacao.tipo : null,
      camareira_id: camareira?.id ?? camareiraOculta,
      data_referencia: dataReferencia,
      identificacao: identificacao(),
    };
  }

  /** Cria a inspeção em andamento uma vez só, para o Kanban ver quem está preenchendo. */
  async function garantirInspecao(): Promise<string> {
    if (inspecaoId) return inspecaoId;
    if (!processo) throw new Error("Escolha o checklist");
    if (!criando.current) {
      criando.current = (async () => {
        const { data, error } = await supabase
          .from("gov_inspecoes")
          .insert({
            processo_id: processo.id,
            ...cabecalho(),
            inspetor_id: eu.id,
            status: "em_andamento",
          })
          .select("id")
          .single();
        if (error || !data) {
          criando.current = null;
          throw error ?? new Error("Falha ao criar inspeção");
        }
        setInspecaoId(data.id);
        return data.id;
      })();
    }
    return criando.current;
  }

  useEffect(() => {
    if (fase !== "perguntas" || inspecaoId || rascunho) return;
    garantirInspecao().catch((err) => mostrarFalha(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, inspecaoId]);

  function mostrarFalha(err: unknown) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? "");
    setErro(
      erroSchemaGov(msg)
        ? MIGRATION_HINT_GOV
        : "Não foi possível salvar o checklist. Verifique a conexão e tente novamente.",
    );
  }

  /** Grava as respostas e os planos de ação da seção, trocando o que já estava salvo dela. */
  async function salvarSecao(secao: SecaoComPerguntas) {
    setErro(null);
    setSalvandoSecao(true);
    try {
      const id = await garantirInspecao();
      // Continuar um checklist pausado o coloca em andamento de novo.
      const { error: e0 } = await supabase
        .from("gov_inspecoes")
        .update({ ...cabecalho(), status: "em_andamento" })
        .eq("id", id);
      if (e0) throw e0;

      const fotos: Record<string, string | null> = {};
      const linhas = [];
      // Só as visíveis são gravadas; a resposta de quem ficou escondido sai (apagada abaixo).
      for (const q of secao.gov_perguntas.filter((p) => !escondidos.perguntas.has(p.id))) {
        const r = respostas[q.id] ?? respostaVazia();
        const tipo = tipoItem(q.tipo);
        const anexoUrl = r.anexoFile
          ? await enviarFoto(id, q.id, r.anexoFile)
          : r.anexoPreview?.startsWith("http")
            ? r.anexoPreview
            : null;
        if (r.anexoFile) fotos[q.id] = anexoUrl;
        let valor: string | null = null;
        if (r.resposta !== "na" && tipo !== "sim_nao") {
          valor =
            tipo === "selecao_multipla"
              ? r.selecionadas.length
                ? JSON.stringify(r.selecionadas)
                : null
              : r.valor.trim() || null;
        }
        linhas.push({
          inspecao_id: id,
          pergunta_id: q.id,
          pergunta_texto: q.texto,
          pergunta_ordem: q.ordem,
          pergunta_tipo: tipo,
          pergunta_peso: Number(q.peso),
          // Conferência do item do local: o que estava cadastrado e o que foi encontrado.
          item_previsto: conferenciaDe(q)?.previsto ?? null,
          item_diferente: Boolean(conferenciaDe(q)) && r.itemDiferente,
          item_encontrado: conferenciaDe(q) && r.itemDiferente ? r.itemEncontrado.trim() || null : null,
          pergunta_grupo: q.grupo,
          secao_nome: secao.nome,
          secao_ordem: secao.ordem,
          resposta: tipo === "sim_nao" || r.resposta === "na" ? r.resposta : null,
          valor,
          comentario: r.comentario.trim() || null,
          anexo_url: anexoUrl,
        });
      }

      const ids = secao.gov_perguntas.map((q) => q.id);
      const { error: eApaga } = await supabase
        .from("gov_respostas")
        .delete()
        .eq("inspecao_id", id)
        .in("pergunta_id", ids);
      if (eApaga) throw eApaga;

      const { data: inseridas, error: e2 } = await supabase
        .from("gov_respostas")
        .insert(linhas)
        .select("id, pergunta_id");
      if (e2) throw e2;

      const idPorPergunta = new Map((inseridas ?? []).map((r) => [r.pergunta_id, r.id]));
      const perguntaPorId = new Map(secoes.flatMap((s) => s.gov_perguntas).map((q) => [q.id, q]));
      const planos = ids.flatMap((perguntaId) => {
        const r = respostas[perguntaId];
        const respostaId = idPorPergunta.get(perguntaId);
        if (!r || r.resposta !== "nao" || !r.plano || !respostaId) return [];
        return [
          {
            resposta_id: respostaId,
            prioridade: r.plano.prioridade,
            o_que_fazer: r.plano.o_que_fazer.trim(),
            quem_vai_fazer: r.plano.quem_vai_fazer.trim() || null,
            quem_pediu: r.plano.quem_pediu.trim() || eu.nome,
            ...extrasParaGravar(lerCamposPlano(perguntaPorId.get(perguntaId)?.plano_campos), r.plano.extras),
          },
        ];
      });
      if (planos.length > 0) {
        const { error: e3 } = await supabase.from("gov_planos_acao").insert(planos);
        if (e3) throw e3;
      }

      if (Object.keys(fotos).length > 0) {
        setRespostas((prev) => {
          const prox = { ...prev };
          for (const [perguntaId, url] of Object.entries(fotos)) {
            prox[perguntaId] = { ...prox[perguntaId], anexoFile: null, anexoPreview: url };
          }
          return prox;
        });
      }
      return true;
    } catch (err) {
      mostrarFalha(err);
      return false;
    } finally {
      setSalvandoSecao(false);
    }
  }

  async function finalizar() {
    if (!processo || (processo.usa_acomodacao && !acomodacao)) return;
    setErro(null);
    setFase("salvando");
    try {
      const id = await garantirInspecao();
      // Resposta salva antes de uma condicional esconder a pergunta (ou a seção) não vale.
      const idsEscondidos = secoes.flatMap((s) =>
        s.gov_perguntas.filter((q) => escondidos.secoes.has(s.id) || escondidos.perguntas.has(q.id)).map((q) => q.id),
      );
      if (idsEscondidos.length) {
        const { error: eLimpa } = await supabase
          .from("gov_respostas")
          .delete()
          .eq("inspecao_id", id)
          .in("pergunta_id", idsEscondidos);
        if (eLimpa) throw eLimpa;
      }
      const { error } = await supabase
        .from("gov_inspecoes")
        .update({ status: "finalizada", finalizada_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      // Os planos de ação viram chamados na Manutenção ao finalizar (gatilho no banco).
      const { data: planos } = await supabase
        .from("gov_respostas")
        .select("gov_planos_acao(chamado_token)")
        .eq("inspecao_id", id)
        .eq("resposta", "nao");
      const todos = (planos ?? []).flatMap((r) => r.gov_planos_acao ?? []);
      setChamadosAbertos(
        todos.length ? { abertos: todos.filter((p) => p.chamado_token).length, total: todos.length } : null,
      );
      setInspecaoIdFinal(id);
      setFase("concluido");
    } catch (err) {
      mostrarFalha(err);
      setFase("perguntas");
    }
  }

  return (
    <div ref={topo} className="scroll-mt-6">
      {fase !== "processo" && fase !== "concluido" && fase !== "salvando" && (
        <button type="button" onClick={voltar} className="mb-3 text-sm text-slate-500 hover:text-slate-800">
          ← Voltar
        </button>
      )}

      {processo && fase !== "processo" && fase !== "concluido" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Chip>{processo.nome}</Chip>
          {acomodacao && (
            <Chip>
              {acomodacao.tipo === "area"
                ? acomodacao.numero
                : `UH ${acomodacao.numero} · ${rotuloTipo(acomodacao.tipo)}`}
            </Chip>
          )}
          {fase === "perguntas" && (
            <>
              {camareira && <Chip>{camareira.nome}</Chip>}
              {dataReferencia !== hoje && <Chip>{formatarDataCurta(dataReferencia)}</Chip>}
            </>
          )}
        </div>
      )}

      <Erro texto={erro} />

      {fase === "processo" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Preencher checklist</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Escolha a propriedade, o setor e o checklist que você vai preencher agora.
                {equipe ? " Para criar ou alterar um checklist, use Criar checklist." : ""}
              </p>
            </div>
            {equipe && (
              <Link href="/governanca/admin/processos?novo=1" className={`${btnSecundario} shrink-0`}>
                + Criar checklist
              </Link>
            )}
          </div>
          {comItens.length === 0 ? (
            <Vazio
              texto={
                equipe
                  ? "Nenhum checklist ativo com perguntas nos seus setores. Use Criar checklist para montar o primeiro."
                  : "Nenhum checklist disponível nos seus setores. Peça ao líder ou ao administrador."
              }
            />
          ) : (
            <EscolhaChecklist
            ondePorProcesso={Object.fromEntries(processos.map((p) => [p.id, rotuloOndeChecklist(p, ligacoes[p.id] ?? [], lugares)]))}
              processos={comItens}
              setores={setores}
              propriedades={propriedades}
              carregando={carregando}
              onEscolher={escolherProcesso}
            />
          )}
        </>
      )}

      {fase === "acomodacao" && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">
            {ehArea ? "Escolha o local" : "Escolha a acomodação"}
          </h2>
          {acomodacoesDoProcesso.length === 0 ? (
            <Vazio
              texto={`Nenhum ${ehArea ? "local" : "UH"} cadastrado para este checklist. O administrador cadastra em Locais e liga o checklist em “Onde se aplica”.`}
            />
          ) : (
            <>
              <div className={`mb-3 grid grid-cols-3 gap-2 ${ehArea ? "hidden" : ""}`}>
                {PREFIXOS_ANDAR.map((prefixo) => (
                  <button
                    key={prefixo}
                    type="button"
                    onClick={() => setPrefixoAndar((atual) => (atual === prefixo ? null : prefixo))}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      prefixoAndar === prefixo
                        ? "bg-brand-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-brand-300"
                    }`}
                  >
                    {prefixo}
                  </button>
                ))}
              </div>
              <input
                className={`${inputCls} mb-4`}
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={ehArea ? "Buscar local…" : "Buscar por número ou tipo…"}
              />
              {filtradas.length === 0 ? (
                <Vazio texto="Nenhuma acomodação encontrada." />
              ) : (
                <>
                  {filtradasDoRelatorio.length > 0 && (
                    <section className="mb-6">
                      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand-700">
                        {dataRelatorio ? "Para limpar" : "Para limpar hoje"} · relatório diário ({filtradasDoRelatorio.length})
                      </h3>
                      <p className="mb-3 text-xs text-slate-500">
                        UHs Sujas ou com Limpeza agendada
                        {dataRelatorio
                          ? ` no relatório de ${dataRelatorio.split("-").reverse().join("/")} (o de hoje ainda não foi enviado).`
                          : " no relatório do dia."}
                      </p>
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                        {filtradasDoRelatorio.map((a) => {
                          const doDia = relatorioPorNumero.get(a.numero);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => escolherAcomodacao(a)}
                              className={`relative flex flex-col items-center rounded-2xl border-2 bg-brand-50 px-1 py-4 shadow-sm transition hover:border-brand-500 ${
                                doDia?.feita ? "border-brand-200 opacity-60" : "border-brand-300"
                              }`}
                            >
                              {doDia?.feita && (
                                <span className="absolute right-2 top-1.5 text-xs font-bold text-brand-600" title="Marcada como feita">
                                  ✓
                                </span>
                              )}
                              <span className="text-[10px] font-medium uppercase text-brand-500">UH</span>
                              <span className="text-xl font-bold text-slate-800">{a.numero}</span>
                              <span className="mt-1 line-clamp-2 text-center text-[11px] leading-tight text-brand-700">
                                {doDia?.tarefa || rotuloTipo(a.tipo, true)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}
                  {ehArea && filtradasOutras.length > 0 && (
                    <div className="space-y-5">
                      {gruposDeLocais(filtradasOutras).map(([caminho, locais]) => (
                        <section key={caminho}>
                          <h3 className="mb-2 break-words text-xs font-semibold uppercase tracking-wide text-slate-500">{caminho}</h3>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {locais.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => escolherAcomodacao(a)}
                                className="min-h-[3.5rem] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold leading-tight text-slate-800 shadow-sm transition hover:border-brand-400"
                              >
                                <span className="break-words">{a.numero}</span>
                              </button>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                  {!ehArea && filtradasOutras.length > 0 && (
                    <section>
                      {filtradasDoRelatorio.length > 0 && (
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Outras acomodações ({filtradasOutras.length})
                        </h3>
                      )}
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                        {filtradasOutras.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => escolherAcomodacao(a)}
                            className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-2 py-4 shadow-sm transition hover:border-brand-400"
                          >
                            <span className="text-[10px] font-medium uppercase text-slate-400">
                              {ehArea ? "Área" : "UH"}
                            </span>
                            <span
                              className={`text-center font-bold text-slate-800 ${ehArea ? "text-sm leading-tight" : "text-xl"}`}
                            >
                              {a.numero}
                            </span>
                            {!ehArea && <span className="mt-1 text-[11px] text-slate-500">{rotuloTipo(a.tipo, true)}</span>}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {fase === "dados" && (
        <PassoDados
          passo={passo}
          eu={eu}
          paraMim={paraMim}
          onParaMim={(valor) => {
            setParaMim(valor);
            if (valor) setCamareira(null);
          }}
          colaboradores={colaboradores}
          colaborador={camareira}
          onColaborador={setCamareira}
          data={dataReferencia}
          hoje={hoje}
          onData={setDataReferencia}
          iniciando={iniciando}
          onContinuar={comecar}
        />
      )}

      {fase === "perguntas" && secaoAtual && (
        <>
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>
                Seção {secaoIndex + 1} de {secoes.length}
              </span>
              <span>
                {secaoAtual.gov_perguntas.filter((q) => !escondidos.perguntas.has(q.id)).length} itens
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${((secaoIndex + 1) / secoes.length) * 100}%` }}
              />
            </div>
          </div>

          <h2 className="mb-4 text-xl font-bold text-slate-800">{secaoAtual.nome}</h2>

          <div className="space-y-5 pb-4">
            {agruparPorGrupo(secaoAtual.gov_perguntas).map((g, i) => (
              <div key={`${g.grupo ?? ""}-${i}`} className="space-y-3">
                {g.grupo && (
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700">{g.grupo}</h3>
                )}
                {g.itens.filter((q) => !escondidos.perguntas.has(q.id)).map((q) => (
                  <PerguntaItem
                    key={q.id}
                    pergunta={q}
                    valor={respostas[q.id] ?? respostaVazia()}
                    onChange={(v) => setRespostas((prev) => ({ ...prev, [q.id]: v }))}
                    responsaveis={nomesCamareiras}
                    responsavelPadrao={camareira?.nome}
                    quemPediu={eu.nome}
                    conferencia={conferenciaDe(q)}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              {temAnterior && (
                <button type="button" onClick={() => irParaSecao(-1)} className={btnSecundario}>
                  Voltar
                </button>
              )}
              <button
                type="button"
                onClick={() => irParaSecao(1)}
                className={`${btnPrimario} flex-1`}
                disabled={!completa || salvandoSecao}
              >
                {salvandoSecao
                  ? "Salvando…"
                  : ultimaSecao
                    ? "Finalizar checklist"
                    : "Próxima seção"}
              </button>
            </div>
            {!completa ? (
              <p className="pt-2 text-center text-xs text-slate-400">
                Responda os itens obrigatórios (e o plano de ação dos &quot;Não&quot;) para continuar.
              </p>
            ) : (
              <p className="pt-2 text-center text-xs text-slate-400">
                As respostas ficam salvas a cada seção. Se sair agora, continue pelo Início.
              </p>
            )}
          </div>
        </>
      )}

      {fase === "salvando" && (
        <p className="py-12 text-center text-sm text-slate-500">Salvando checklist…</p>
      )}

      {fase === "concluido" && (
        <div className={`${cardCls} mx-auto max-w-md text-center`}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl text-brand-700">
            ✓
          </div>
          <h2 className="text-lg font-bold text-slate-800">Checklist finalizado!</h2>
          <p className="mt-1 text-sm text-slate-500">
            {acomodacao
              ? `A inspeção da UH ${acomodacao.numero} foi registrada com sucesso.`
              : `"${processo?.nome}" foi registrado com sucesso.`}
          </p>
          {notaFinal !== null && (
            <div className="mt-5 rounded-xl bg-slate-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nota da vistoria</p>
              <p className={`mt-1 text-5xl font-bold ${corNota(notaFinal)}`}>
                {notaFinal}
                <span className="text-lg font-medium text-slate-400"> / 100</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {contagemFinal.nao === 0
                  ? "Nenhum item marcado como Não."
                  : `${contagemFinal.nao} ${contagemFinal.nao === 1 ? "item marcado" : "itens marcados"} como Não de ${contagemFinal.sim + contagemFinal.nao}.`}
              </p>
            </div>
          )}
          {chamadosAbertos && (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                chamadosAbertos.abertos === chamadosAbertos.total
                  ? "bg-brand-50 text-brand-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {chamadosAbertos.abertos === chamadosAbertos.total
                ? `🔧 ${chamadosAbertos.abertos} ${chamadosAbertos.abertos === 1 ? "plano de ação virou chamado" : "planos de ação viraram chamados"} no quadro da Manutenção.`
                : `${chamadosAbertos.abertos} de ${chamadosAbertos.total} planos de ação viraram chamado na Manutenção. Abra o resumo para conferir.`}
            </p>
          )}
          <div className="mt-6 grid gap-2">
            {inspecaoIdFinal && (
              <Link href={`/governanca/inspecao/${inspecaoIdFinal}`} className={btnSecundario}>
                Ver resumo
              </Link>
            )}
            <Link href="/governanca" className={btnPrimario}>
              Voltar ao início
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}
