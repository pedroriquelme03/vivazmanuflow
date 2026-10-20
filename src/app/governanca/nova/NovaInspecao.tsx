"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import {
  BUCKET_GOVERNANCA,
  MIGRATION_HINT_GOV,
  agruparPorCategoria,
  agruparPorGrupo,
  erroSchemaGov,
  filtrarAcomodacoes,
  normalizarBusca,
  ordenarSecoes,
  rotuloAplicacao,
  rotuloTipo,
  secaoCompleta,
  secaoParaRetomar,
  tipoItem,
  type Acomodacao,
  type Camareira,
  type Prioridade,
  type Processo,
  type SecaoComPerguntas,
} from "@/lib/governanca";
import { PerguntaItem, respostaVazia, type RespostaLocal } from "./PerguntaItem";
import { Erro, Vazio, btnPrimario, btnSecundario, cardCls, inputCls } from "../ui";

type Fase = "processo" | "acomodacao" | "camareira" | "perguntas" | "salvando" | "concluido";
type ProcessoResumo = Processo & { itens: number };
type ProcessoCompleto = ProcessoResumo & { secoes: SecaoComPerguntas[] };

/** Checklist em andamento que a pessoa reabriu pelo Início. */
export type RascunhoInspecao = {
  id: string;
  processoId: string;
  acomodacaoId: string | null;
  camareiraId: string | null;
  respostas: {
    pergunta_id: string | null;
    resposta: string | null;
    valor: string | null;
    comentario: string | null;
    anexo_url: string | null;
    plano: {
      prioridade: string;
      o_que_fazer: string;
      quem_vai_fazer: string | null;
      quem_pediu: string | null;
    } | null;
  }[];
};

const PREFIXOS_ANDAR = ["10", "11", "12"] as const;

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
    plano: r.plano
      ? {
          prioridade: (["baixa", "media", "alta"].includes(r.plano.prioridade)
            ? r.plano.prioridade
            : "media") as Prioridade,
          o_que_fazer: r.plano.o_que_fazer,
          quem_vai_fazer: r.plano.quem_vai_fazer ?? "",
          quem_pediu: r.plano.quem_pediu ?? "",
        }
      : null,
  };
}

export function NovaInspecao({
  eu,
  ehAdmin,
  escolheCamareira,
  acomodacoes,
  camareiras,
  processos,
  rascunho,
}: {
  eu: { id: string; nome: string };
  ehAdmin: boolean;
  escolheCamareira: boolean;
  acomodacoes: Acomodacao[];
  camareiras: Camareira[];
  processos: ProcessoResumo[];
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

  const [secaoIndex, setSecaoIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, RespostaLocal>>({});

  const [inspecaoId, setInspecaoId] = useState<string | null>(rascunho?.id ?? null);
  const [salvandoSecao, setSalvandoSecao] = useState(false);
  const criando = useRef<Promise<string> | null>(null);
  const [inspecaoIdFinal, setInspecaoIdFinal] = useState<string | null>(null);
  const [buscaProcesso, setBuscaProcesso] = useState("");
  const [busca, setBusca] = useState("");
  const [prefixoAndar, setPrefixoAndar] = useState<string | null>(null);

  const comItens = processos.filter((p) => p.itens > 0);
  const gruposProcesso = agruparPorCategoria(
    comItens.filter((p) => {
      const q = normalizarBusca(buscaProcesso);
      return !q || normalizarBusca(`${p.categoria ?? ""} ${p.nome}`).includes(q);
    }),
  );

  const secoes = processo?.secoes ?? [];
  const secaoAtual = secoes[secaoIndex];
  const acomodacoesDoProcesso = acomodacoes.filter(
    (a) => !processo || processo.tipo === "ambos" || a.tipo === processo.tipo,
  );
  const filtradas = filtrarAcomodacoes(acomodacoesDoProcesso, busca, prefixoAndar);
  const completa = secaoAtual ? secaoCompleta(secaoAtual.gov_perguntas, respostas) : false;
  const nomesCamareiras = camareiras.map((c) => c.nome);
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
    setCarregando(false);
    if (error) {
      setErro("Não foi possível abrir o checklist. Tente de novo.");
      return null;
    }
    const p: ProcessoCompleto = { ...resumo, secoes: ordenarSecoes((data ?? []) as SecaoComPerguntas[]) };
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
      setCamareira(camareiras.find((c) => c.id === rascunho.camareiraId) ?? null);
      setRespostas(init);
      setSecaoIndex(secaoParaRetomar(p.secoes, init));
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
    const init: Record<string, RespostaLocal> = {};
    p.secoes.forEach((s) => s.gov_perguntas.forEach((q) => (init[q.id] = respostaVazia())));
    setRespostas(init);
    setSecaoIndex(p.secoes.findIndex((s) => s.gov_perguntas.length > 0));
    setFase(p.usa_acomodacao ? "acomodacao" : "perguntas");
    subir();
  }

  function escolherAcomodacao(a: Acomodacao) {
    setAcomodacao(a);
    setErro(null);
    setFase(escolheCamareira ? "camareira" : "perguntas");
  }

  async function irParaSecao(delta: 1 | -1) {
    let i = secaoIndex + delta;
    while (i >= 0 && i < secoes.length && secoes[i].gov_perguntas.length === 0) i += delta;
    if (i < 0) return;
    if (delta === 1 && secaoAtual) {
      const salvou = await salvarSecao(secaoAtual);
      if (!salvou) return;
    }
    if (i >= secoes.length) return finalizar();
    setSecaoIndex(i);
    subir();
  }

  const ultimaSecao = !secoes.slice(secaoIndex + 1).some((s) => s.gov_perguntas.length > 0);
  const temAnterior = secoes.slice(0, secaoIndex).some((s) => s.gov_perguntas.length > 0);

  function voltar() {
    setErro(null);
    if (fase === "perguntas" && temAnterior) return irParaSecao(-1);
    if (fase === "perguntas" && usaUh) return setFase(escolheCamareira ? "camareira" : "acomodacao");
    if (fase === "camareira") return setFase("acomodacao");
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

  function cabecalho() {
    return {
      acomodacao_id: acomodacao?.id ?? null,
      tipo: acomodacao ? (acomodacao.tipo === "suite" ? "suite" : "apartamento") : null,
      camareira_id: camareira?.id ?? null,
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
      const { error: e0 } = await supabase.from("gov_inspecoes").update(cabecalho()).eq("id", id);
      if (e0) throw e0;

      const fotos: Record<string, string | null> = {};
      const linhas = [];
      for (const q of secao.gov_perguntas) {
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
      const { error } = await supabase
        .from("gov_inspecoes")
        .update({ status: "finalizada", finalizada_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
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
              UH {acomodacao.numero} · {rotuloTipo(acomodacao.tipo)}
            </Chip>
          )}
          {camareira && fase === "perguntas" && <Chip>{camareira.nome}</Chip>}
        </div>
      )}

      <Erro texto={erro} />

      {fase === "processo" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Preencher checklist</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Escolha qual checklist você vai preencher agora.
                {ehAdmin ? " Para criar ou alterar um checklist, use Criar checklist." : ""}
              </p>
            </div>
            {ehAdmin && (
              <Link href="/governanca/admin/processos?novo=1" className={`${btnSecundario} shrink-0`}>
                + Criar checklist
              </Link>
            )}
          </div>
          {comItens.length === 0 ? (
            <Vazio
              texto={
                ehAdmin
                  ? "Nenhum checklist ativo com perguntas. Use Criar checklist para montar o primeiro."
                  : "Nenhum checklist disponível ainda. Peça ao administrador para cadastrar."
              }
            />
          ) : (
            <>
              <input
                className={`${inputCls} mb-4`}
                type="search"
                value={buscaProcesso}
                onChange={(e) => setBuscaProcesso(e.target.value)}
                placeholder="Buscar checklist…"
              />
              {gruposProcesso.length === 0 && <Vazio texto="Nenhum checklist encontrado." />}
              {gruposProcesso.map((g) => (
                <section key={g.categoria} className="mb-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {g.categoria}
                  </h3>
                  <div className="space-y-2">
                    {g.itens.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={carregando}
                        onClick={() => escolherProcesso(p)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-400"
                      >
                        <span className="text-xl">📋</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-slate-800">{p.nome}</span>
                          <span className="block text-xs text-slate-500">
                            {p.itens} itens ·{" "}
                            {rotuloAplicacao(p)}
                            {p.descricao ? ` · ${p.descricao}` : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}

      {fase === "acomodacao" && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Escolha a acomodação</h2>
          {acomodacoesDoProcesso.length === 0 ? (
            <Vazio texto="Nenhuma acomodação cadastrada para este checklist." />
          ) : (
            <>
              <div className="mb-3 grid grid-cols-3 gap-2">
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
                placeholder="Buscar por número ou tipo…"
              />
              {filtradas.length === 0 ? (
                <Vazio texto="Nenhuma acomodação encontrada." />
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {filtradas.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => escolherAcomodacao(a)}
                      className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-4 shadow-sm transition hover:border-brand-400"
                    >
                      <span className="text-[10px] font-medium uppercase text-slate-400">UH</span>
                      <span className="text-xl font-bold text-slate-800">{a.numero}</span>
                      <span className="mt-1 text-[11px] text-slate-500">{rotuloTipo(a.tipo, true)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {fase === "camareira" && (
        <>
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Quem limpou o quarto?</h2>
          <p className="mb-3 text-sm text-slate-500">Selecione a camareira responsável pela limpeza.</p>
          {camareiras.length === 0 ? (
            <Vazio texto="Nenhuma camareira cadastrada." />
          ) : (
            <div className="space-y-2">
              {camareiras.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCamareira(c)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition ${
                    camareira?.id === c.id
                      ? "border-brand-400 bg-brand-50"
                      : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                    {c.nome.charAt(0)}
                  </span>
                  <span className="font-medium text-slate-800">{c.nome}</span>
                  {camareira?.id === c.id && <span className="ml-auto text-brand-600">✓</span>}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setFase("perguntas")}
            className={`${btnPrimario} mt-6 w-full`}
            disabled={!camareira && camareiras.length > 0}
          >
            Continuar
          </button>
        </>
      )}

      {fase === "perguntas" && secaoAtual && (
        <>
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>
                Seção {secaoIndex + 1} de {secoes.length}
              </span>
              <span>{secaoAtual.gov_perguntas.length} itens</span>
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
                {g.itens.map((q) => (
                  <PerguntaItem
                    key={q.id}
                    pergunta={q}
                    valor={respostas[q.id] ?? respostaVazia()}
                    onChange={(v) => setRespostas((prev) => ({ ...prev, [q.id]: v }))}
                    responsaveis={nomesCamareiras}
                    responsavelPadrao={camareira?.nome}
                    quemPediu={eu.nome}
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
