"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import {
  BUCKET_GOVERNANCA,
  MIGRATION_HINT_GOV,
  erroSchemaGov,
  filtrarAcomodacoes,
  rotuloTipo,
  secaoCompleta,
  type Acomodacao,
  type Camareira,
  type Processo,
  type SecaoComPerguntas,
  type TipoAcomodacao,
} from "@/lib/governanca";
import { PerguntaItem, respostaVazia, type RespostaLocal } from "./PerguntaItem";
import { Erro, Vazio, btnPrimario, btnSecundario, cardCls, inputCls } from "../ui";

type Fase = "acomodacao" | "tipo" | "processo" | "camareira" | "perguntas" | "salvando" | "concluido";
type ProcessoCompleto = Processo & { secoes: SecaoComPerguntas[] };

const PREFIXOS_ANDAR = ["10", "11", "12"] as const;

export function NovaInspecao({
  eu,
  escolheCamareira,
  acomodacoes,
  camareiras,
  processos,
}: {
  eu: { id: string; nome: string };
  escolheCamareira: boolean;
  acomodacoes: Acomodacao[];
  camareiras: Camareira[];
  processos: ProcessoCompleto[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const topo = useRef<HTMLDivElement>(null);

  const [fase, setFase] = useState<Fase>("acomodacao");
  const [erro, setErro] = useState<string | null>(null);

  const [acomodacao, setAcomodacao] = useState<Acomodacao | null>(null);
  const [tipo, setTipo] = useState<TipoAcomodacao>("apartamento");
  const [processo, setProcesso] = useState<ProcessoCompleto | null>(null);
  const [camareira, setCamareira] = useState<Camareira | null>(null);

  const [secaoIndex, setSecaoIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, RespostaLocal>>({});

  const [inspecaoIdFinal, setInspecaoIdFinal] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [prefixoAndar, setPrefixoAndar] = useState<string | null>(null);

  const secoes = processo?.secoes ?? [];
  const secaoAtual = secoes[secaoIndex];
  const processosDoTipo = processos.filter((p) => p.tipo === tipo || p.tipo === "ambos");
  const filtradas = filtrarAcomodacoes(acomodacoes, busca, prefixoAndar);
  const completa = secaoAtual ? secaoCompleta(secaoAtual.gov_perguntas, respostas) : false;

  function subir() {
    topo.current?.scrollIntoView({ block: "start" });
  }

  function escolherAcomodacao(a: Acomodacao) {
    setAcomodacao(a);
    setTipo(a.tipo === "suite" ? "suite" : "apartamento");
    setErro(null);
    setFase("tipo");
  }

  function confirmarTipo() {
    setErro(null);
    if (processosDoTipo.length === 0) {
      setErro("Nenhum checklist ativo para este tipo. Cadastre um em Checklists.");
      return;
    }
    if (processosDoTipo.length === 1) escolherProcesso(processosDoTipo[0]);
    else setFase("processo");
  }

  function escolherProcesso(p: ProcessoCompleto) {
    if (p.secoes.every((s) => s.gov_perguntas.length === 0)) {
      setErro("Este checklist ainda não tem perguntas.");
      return;
    }
    setErro(null);
    setProcesso(p);
    const init: Record<string, RespostaLocal> = {};
    p.secoes.forEach((s) => s.gov_perguntas.forEach((q) => (init[q.id] = respostaVazia())));
    setRespostas(init);
    setSecaoIndex(p.secoes.findIndex((s) => s.gov_perguntas.length > 0));
    setFase(escolheCamareira ? "camareira" : "perguntas");
  }

  function irParaSecao(delta: 1 | -1) {
    let i = secaoIndex + delta;
    while (i >= 0 && i < secoes.length && secoes[i].gov_perguntas.length === 0) i += delta;
    if (i < 0) return;
    if (i >= secoes.length) return finalizar();
    setSecaoIndex(i);
    subir();
  }

  const ultimaSecao = !secoes.slice(secaoIndex + 1).some((s) => s.gov_perguntas.length > 0);
  const temAnterior = secoes.slice(0, secaoIndex).some((s) => s.gov_perguntas.length > 0);

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

  async function finalizar() {
    if (!acomodacao || !processo) return;
    setErro(null);
    setFase("salvando");
    try {
      const { data: insp, error: e1 } = await supabase
        .from("gov_inspecoes")
        .insert({
          processo_id: processo.id,
          acomodacao_id: acomodacao.id,
          tipo,
          camareira_id: camareira?.id ?? null,
          inspetor_id: eu.id,
          status: "finalizada",
          finalizada_em: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (e1 || !insp) throw e1 ?? new Error("Falha ao criar inspeção");

      const linhas = [];
      for (const s of secoes) {
        for (const q of s.gov_perguntas) {
          const r = respostas[q.id];
          const anexoUrl = r?.anexoFile ? await enviarFoto(insp.id, q.id, r.anexoFile) : null;
          linhas.push({
            inspecao_id: insp.id,
            pergunta_id: q.id,
            pergunta_texto: q.texto,
            pergunta_ordem: q.ordem,
            secao_nome: s.nome,
            secao_ordem: s.ordem,
            resposta: r?.resposta ?? null,
            comentario: r?.comentario.trim() || null,
            anexo_url: anexoUrl,
          });
        }
      }

      const { data: inseridas, error: e2 } = await supabase
        .from("gov_respostas")
        .insert(linhas)
        .select("id, pergunta_id");
      if (e2) throw e2;

      const idPorPergunta = new Map((inseridas ?? []).map((r) => [r.pergunta_id, r.id]));
      const planos = Object.entries(respostas)
        .filter(([, r]) => r.resposta === "nao" && r.plano)
        .flatMap(([perguntaId, r]) => {
          const respostaId = idPorPergunta.get(perguntaId);
          if (!respostaId) return [];
          return [
            {
              resposta_id: respostaId,
              prioridade: r.plano!.prioridade,
              o_que_fazer: r.plano!.o_que_fazer.trim(),
              quem_vai_fazer: r.plano!.quem_vai_fazer.trim() || null,
              quem_pediu: r.plano!.quem_pediu.trim() || eu.nome,
            },
          ];
        });
      if (planos.length > 0) {
        const { error: e3 } = await supabase.from("gov_planos_acao").insert(planos);
        if (e3) throw e3;
      }

      setInspecaoIdFinal(insp.id);
      setFase("concluido");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? "");
      setErro(
        erroSchemaGov(msg)
          ? MIGRATION_HINT_GOV
          : "Não foi possível salvar o checklist. Verifique a conexão e tente novamente.",
      );
      setFase("perguntas");
    }
  }

  return (
    <div ref={topo} className="scroll-mt-6">
      {fase !== "acomodacao" && fase !== "concluido" && fase !== "salvando" && (
        <button
          type="button"
          onClick={() => {
            setErro(null);
            if (fase === "perguntas" && temAnterior) return irParaSecao(-1);
            if (fase === "perguntas") return setFase(escolheCamareira ? "camareira" : "tipo");
            if (fase === "camareira") return setFase("tipo");
            if (fase === "processo") return setFase("tipo");
            setFase("acomodacao");
          }}
          className="mb-3 text-sm text-slate-500 hover:text-slate-800"
        >
          ← Voltar
        </button>
      )}

      {acomodacao && fase !== "concluido" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Chip>UH {acomodacao.numero}</Chip>
          {(fase === "processo" || fase === "camareira" || fase === "perguntas") && (
            <Chip>{rotuloTipo(tipo)}</Chip>
          )}
          {processo && fase === "perguntas" && <Chip>{processo.nome}</Chip>}
          {camareira && fase === "perguntas" && <Chip>{camareira.nome}</Chip>}
        </div>
      )}

      <Erro texto={erro} />

      {fase === "acomodacao" && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Escolha a acomodação</h2>
          {acomodacoes.length === 0 ? (
            <Vazio texto="Nenhuma acomodação cadastrada." />
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

      {fase === "tipo" && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Tipo de acomodação</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["apartamento", "suite"] as TipoAcomodacao[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-6 shadow-sm transition ${
                  tipo === t
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span className="text-3xl">{t === "suite" ? "🛏️" : "🚪"}</span>
                <span className="font-semibold">{rotuloTipo(t)}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={confirmarTipo} className={`${btnPrimario} mt-6 w-full`}>
            Continuar
          </button>
        </>
      )}

      {fase === "processo" && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Escolha o checklist</h2>
          <div className="space-y-2">
            {processosDoTipo.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => escolherProcesso(p)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-400"
              >
                <span className="text-xl">📋</span>
                <span>
                  <span className="block font-semibold text-slate-800">{p.nome}</span>
                  {p.descricao && <span className="block text-xs text-slate-500">{p.descricao}</span>}
                </span>
              </button>
            ))}
          </div>
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
            disabled={!camareira}
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

          <div className="space-y-3 pb-4">
            {secaoAtual.gov_perguntas.map((q) => (
              <PerguntaItem
                key={q.id}
                pergunta={q}
                valor={respostas[q.id] ?? respostaVazia()}
                onChange={(v) => setRespostas((prev) => ({ ...prev, [q.id]: v }))}
                camareiras={camareiras}
                camareiraPadrao={camareira?.nome}
                quemPediu={eu.nome}
              />
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
                disabled={!completa}
              >
                {ultimaSecao ? "Finalizar checklist" : "Próxima seção"}
              </button>
            </div>
            {!completa && (
              <p className="pt-2 text-center text-xs text-slate-400">
                Responda todos os itens (e preencha o plano de ação dos &quot;Não&quot;) para continuar.
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✓
          </div>
          <h2 className="text-lg font-bold text-slate-800">Checklist finalizado!</h2>
          <p className="mt-1 text-sm text-slate-500">
            A inspeção da UH {acomodacao?.numero} foi registrada com sucesso.
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
