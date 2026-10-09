"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { DemandaKanban } from "@/lib/demanda-select";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  PRIORIDADE_LABEL,
  formatarData,
  calcularUrgencia,
  PRAZO_COR,
  nomeSublocal,
  ehMotivoNaoPerturbe,
} from "@/lib/demanda-ui";
import {
  aprovarConclusaoGestor,
  devolverDemandaGestor,
  concluirDemandaAdmin,
  arquivarDemandaGestor,
  apagarDemandaGestor,
} from "@/lib/demanda-gestor";
import { PrioridadeTag } from "@/components/PrioridadeTag";
import { VideoAnexo } from "@/components/VideoAnexo";
import { ChatChamado } from "@/components/ChatChamado";
import { EscolherMidia } from "@/components/EscolherMidia";
import { equipePodeMandarMensagem } from "@/lib/chamado-chat";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { idUnico } from "@/lib/id-unico";
import { uploadAnexo } from "@/lib/upload-anexo";
import { solicitantesUnicos } from "@/lib/solicitante-gestor";
import type { Enums } from "@/lib/database.types";

type HistoricoItem = {
  id: string;
  status_anterior: Enums<"demanda_status"> | null;
  status_novo: Enums<"demanda_status">;
  observacao: string | null;
  criado_em: string;
};

type AnexoItem = {
  id: string;
  url: string;
  tipo: Enums<"anexo_tipo">;
  enviado_por: Enums<"anexo_autor">;
  criado_em: string;
};

export function DetalheDemandaModal({
  demanda,
  agora,
  ehAdmin = false,
  ambiente = "manutencao",
  eu,
  slaHoras = {},
  solicitantes = [],
  sistemas = [],
  onFechar,
  onAtribuir,
  onAtualizou,
}: {
  demanda: DemandaKanban;
  agora: number;
  ehAdmin?: boolean;
  ambiente?: "manutencao" | "ti";
  eu?: { id: string; nome: string };
  slaHoras?: Record<string, number>;
  solicitantes?: { id: string; nome: string; propriedade_id: string }[];
  sistemas?: { id: string; nome: string }[];
  onFechar: () => void;
  onAtribuir: () => void;
  onAtualizou: (fechar?: boolean) => void;
}) {
  const supabase = createClient();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [anexos, setAnexos] = useState<AnexoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [textoApagar, setTextoApagar] = useState("");
  const [msgDevolucao, setMsgDevolucao] = useState("");
  const [confirmandoDevolver, setConfirmandoDevolver] = useState(false);
  const [msgConclusao, setMsgConclusao] = useState("");
  const [printsConclusao, setPrintsConclusao] = useState<File[]>([]);
  const [confirmandoConcluir, setConfirmandoConcluir] = useState(false);
  const [editandoConteudo, setEditandoConteudo] = useState(false);
  const [tituloEdit, setTituloEdit] = useState(demanda.titulo);
  const [descricaoEdit, setDescricaoEdit] = useState(demanda.descricao ?? "");
  const [sublocalEdit, setSublocalEdit] = useState(demanda.sublocal ?? "");
  const [sistemaEdit, setSistemaEdit] = useState(demanda.sistema_id ?? "");
  const [solicitanteEdit, setSolicitanteEdit] = useState(demanda.solicitante_id);
  const [prioridadeEdit, setPrioridadeEdit] = useState(demanda.prioridade);
  const [afetaEdit, setAfetaEdit] = useState(demanda.afeta_experiencia);
  const [ambienteEdit, setAmbienteEdit] = useState<"manutencao" | "ti">(
    demanda.ambiente === "ti" || demanda.ambiente === "manutencao"
      ? demanda.ambiente
      : ambiente,
  );

  const arquivado = Boolean(demanda.arquivado);
  const podeAtribuir =
    !arquivado &&
    (demanda.status === "aberta" ||
      demanda.status === "atribuida" ||
      demanda.status === "em_andamento");
  const podeConcluirAdmin = ehAdmin && podeAtribuir;
  const podePegarParaMim =
    ambiente === "ti" &&
    ehAdmin &&
    Boolean(eu) &&
    !arquivado &&
    demanda.status === "aberta" &&
    demanda.colaborador_id !== eu?.id;

  const urgencia =
    demanda.status === "concluida" ||
    demanda.status === "cancelada" ||
    arquivado
      ? null
      : calcularUrgencia(demanda.prazo_confirmado, demanda.atribuido_em, agora);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      const [{ data: hist }, { data: anx }] = await Promise.all([
        supabase
          .from("demanda_historico")
          .select("id, status_anterior, status_novo, observacao, criado_em")
          .eq("demanda_id", demanda.id)
          .order("criado_em", { ascending: true }),
        supabase
          .from("demanda_anexos")
          .select("id, url, tipo, enviado_por, criado_em")
          .eq("demanda_id", demanda.id)
          .order("criado_em", { ascending: true }),
      ]);
      if (!ativo) return;
      setHistorico((hist ?? []) as HistoricoItem[]);
      setAnexos((anx ?? []) as AnexoItem[]);
      setCarregando(false);
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [demanda.id, supabase]);

  useEffect(() => {
    if (editandoConteudo) return;
    setTituloEdit(demanda.titulo);
    setDescricaoEdit(demanda.descricao ?? "");
    setSublocalEdit(demanda.sublocal ?? "");
    setSistemaEdit(demanda.sistema_id ?? "");
    setSolicitanteEdit(demanda.solicitante_id);
    setPrioridadeEdit(demanda.prioridade);
    setAfetaEdit(demanda.afeta_experiencia);
    setAmbienteEdit(
      demanda.ambiente === "ti" || demanda.ambiente === "manutencao"
        ? demanda.ambiente
        : ambiente,
    );
  }, [
    editandoConteudo,
    ambiente,
    demanda.titulo,
    demanda.descricao,
    demanda.sublocal,
    demanda.sistema_id,
    demanda.solicitante_id,
    demanda.prioridade,
    demanda.afeta_experiencia,
    demanda.ambiente,
  ]);

  async function atribuirAMim() {
    if (!eu) return;
    setErro(null);
    setOcupado(true);
    const horas = slaHoras[demanda.prioridade] ?? 24;
    const { error } = await supabase
      .from("demandas")
      .update({
        colaborador_id: eu.id,
        status: "atribuida",
        atribuido_em: new Date().toISOString(),
        prazo_confirmado: new Date(Date.now() + horas * 3600_000).toISOString(),
      })
      .eq("id", demanda.id);
    if (error) {
      setOcupado(false);
      setErro("Não foi possível atribuir a você. Tente novamente.");
      return;
    }
    await supabase.from("demanda_historico").insert({
      demanda_id: demanda.id,
      status_anterior: demanda.status,
      status_novo: "atribuida",
      observacao: `${eu.nome} atribuiu a demanda a si`,
    });
    setOcupado(false);
    onAtualizou(false);
  }

  async function arquivar(valor: boolean) {
    setErro(null);
    setOcupado(true);
    const erroArq = await arquivarDemandaGestor(supabase, demanda.id, valor);
    setOcupado(false);
    if (erroArq) {
      setErro(erroArq);
      return;
    }
    onAtualizou();
  }

  async function aprovarConclusao() {
    setErro(null);
    setOcupado(true);
    const erroAprovar = await aprovarConclusaoGestor(supabase, demanda.id);
    setOcupado(false);
    if (erroAprovar) {
      setErro(erroAprovar);
      return;
    }
    onAtualizou();
    onFechar();
  }

  async function enviarPrintConclusao(arquivoOrigem: File) {
    const arquivo = await comprimirImagem(arquivoOrigem);
    const caminho = `conclusao/${idUnico()}.jpg`;
    const tipo = arquivo.type && arquivo.type !== "" ? arquivo.type : "image/jpeg";
    const { error: upErro } = await uploadAnexo(supabase, caminho, arquivo, tipo);
    if (upErro) throw new Error(upErro.message);
    const url = supabase.storage.from("anexos").getPublicUrl(caminho).data.publicUrl;
    const { error: anxErro } = await supabase.from("demanda_anexos").insert({
      demanda_id: demanda.id,
      tipo: "foto",
      url,
      enviado_por: "colaborador",
    });
    if (anxErro) throw new Error(anxErro.message);
  }

  async function concluirComoAdmin() {
    setErro(null);
    setOcupado(true);
    try {
      for (const arquivo of printsConclusao) {
        await enviarPrintConclusao(arquivo);
      }
      const erroConc = await concluirDemandaAdmin(
        supabase,
        demanda.id,
        msgConclusao,
        demanda.status,
        arquivado,
      );
      if (erroConc) {
        setErro(erroConc);
        setOcupado(false);
        return;
      }
      onAtualizou();
      onFechar();
    } catch (err) {
      setErro(
        err instanceof Error && err.message
          ? `Não deu para enviar a print: ${err.message}`
          : "Não deu para enviar a print.",
      );
      setOcupado(false);
    }
  }

  async function devolverParaAndamento() {
    setErro(null);
    setOcupado(true);
    const erroDev = await devolverDemandaGestor(
      supabase,
      demanda.id,
      msgDevolucao,
    );
    setOcupado(false);
    if (erroDev) {
      setErro(erroDev);
      return;
    }
    onAtualizou();
    onFechar();
  }

  async function apagar() {
    if (textoApagar !== "APAGAR") return;
    setErro(null);
    setOcupado(true);
    const erroAp = await apagarDemandaGestor(supabase, demanda.id);
    setOcupado(false);
    if (erroAp) {
      setErro(erroAp);
      return;
    }
    onAtualizou();
  }

  async function salvarConteudo() {
    const titulo = tituloEdit.trim();
    if (!titulo) {
      setErro("Escreva o título do chamado.");
      return;
    }
    if (!solicitanteEdit) {
      setErro("Escolha quem solicitou.");
      return;
    }
    const quadroTi = ambienteEdit === "ti";
    const sistema = quadroTi ? sistemaEdit : "";
    if (quadroTi && !sistema && !sublocalEdit.trim()) {
      setErro("Informe o local ou escolha um sistema.");
      return;
    }
    setOcupado(true);
    setErro(null);
    const descricao = descricaoEdit.trim();
    const sublocal = sistema ? "" : sublocalEdit.trim();
    const { error } = await supabase
      .from("demandas")
      .update({
        titulo,
        descricao: descricao || null,
        sublocal: sublocal || null,
        solicitante_id: solicitanteEdit,
        prioridade: prioridadeEdit,
        afeta_experiencia: afetaEdit,
        ambiente: ambienteEdit,
        ...(demanda.sistema_id !== undefined || sistema
          ? { sistema_id: sistema || null }
          : {}),
      })
      .eq("id", demanda.id);
    if (error) {
      setOcupado(false);
      setErro(
        error.message.includes("sistema_id") ||
          (error.message.includes("schema cache") &&
            error.message.includes("sistema"))
          ? "Rode o SQL em supabase/migrations/20261009140000_sistemas_ti.sql no Supabase."
          : error.message,
      );
      return;
    }
    await supabase.from("demanda_historico").insert({
      demanda_id: demanda.id,
      status_anterior: demanda.status,
      status_novo: demanda.status,
      observacao: "Administrador alterou o chamado",
    });
    setOcupado(false);
    onAtualizou();
  }

  const opcoesSolicitante = solicitantesUnicos(
    solicitantes.filter((s) => s.propriedade_id === demanda.propriedade_id),
  ).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const solicitanteAtualNaLista = opcoesSolicitante.some(
    (s) => s.id === demanda.solicitante_id,
  );
  const opcoesSistema = [...sistemas];
  if (
    demanda.sistema_id &&
    !opcoesSistema.some((s) => s.id === demanda.sistema_id)
  ) {
    opcoesSistema.unshift({
      id: demanda.sistema_id,
      nome: demanda.sistema?.nome ?? "Sistema atual",
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="flex max-h-[min(88dvh,calc(100dvh-1.5rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">
              {demanda.titulo}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {[
                demanda.propriedade?.nome,
                demanda.sistema?.nome
                  ? `Sistema: ${demanda.sistema.nome}`
                  : nomeSublocal(demanda.sublocal, demanda.local?.nome),
              ]
                .filter(Boolean)
                .join(" · ") || "Sem local"}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <PrioridadeTag prioridade={demanda.prioridade} />
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[demanda.status]}`}
            >
              {STATUS_LABEL[demanda.status]}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                demanda.afeta_experiencia || (demanda.peso ?? 0) >= 10
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Peso {demanda.peso ?? "—"}
            </span>
            {arquivado && (
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-semibold text-white">
                Arquivada
              </span>
            )}
          </div>

          {demanda.afeta_experiencia && !editandoConteudo && (
            <p className="mt-2 text-xs font-semibold text-red-600">
              Afeta a experiência do hóspede
            </p>
          )}

          {demanda.projeto?.nome && (
            <p className="mt-2 text-xs font-semibold text-sky-800">
              Projeto: {demanda.projeto.nome}
            </p>
          )}

          {demanda.evento?.nome && (
            <p className="mt-2 text-xs font-semibold text-violet-700">
              🎉 Evento: {demanda.evento.nome}
            </p>
          )}

          {ehAdmin && !editandoConteudo && (
            <button
              type="button"
              onClick={() => setEditandoConteudo(true)}
              className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Editar chamado
            </button>
          )}

          {editandoConteudo && (
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void salvarConteudo();
              }}
            >
              <label className="block text-xs font-medium text-slate-600">
                Título
                <input
                  value={tituloEdit}
                  onChange={(e) => setTituloEdit(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  required
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Descrição
                <textarea
                  value={descricaoEdit}
                  onChange={(e) => setDescricaoEdit(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </label>
              {ambienteEdit === "ti" && (
                <label className="block text-xs font-medium text-slate-600">
                  Sistema
                  <select
                    value={sistemaEdit}
                    onChange={(e) => {
                      setSistemaEdit(e.target.value);
                      if (e.target.value) setSublocalEdit("");
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">Não é de um sistema</option>
                    {opcoesSistema.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                  {sistemaEdit && (
                    <span className="mt-1 block font-normal text-slate-500">
                      Com sistema, o local não é necessário.
                    </span>
                  )}
                </label>
              )}
              {!(ambienteEdit === "ti" && sistemaEdit) && (
              <label className="block text-xs font-medium text-slate-600">
                Local
                <input
                  value={sublocalEdit}
                  onChange={(e) => setSublocalEdit(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </label>
              )}
              <label className="block text-xs font-medium text-slate-600">
                Quem solicitou
                <select
                  value={solicitanteEdit}
                  onChange={(e) => setSolicitanteEdit(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                >
                  {!solicitanteAtualNaLista && demanda.solicitante_id && (
                    <option value={demanda.solicitante_id}>
                      {demanda.solicitante?.nome ?? "Solicitante atual"}
                    </option>
                  )}
                  {opcoesSolicitante.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Prioridade
                <select
                  value={prioridadeEdit}
                  onChange={(e) =>
                    setPrioridadeEdit(
                      e.target.value as Enums<"demanda_prioridade">,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                >
                  {(
                    Object.keys(PRIORIDADE_LABEL) as Enums<"demanda_prioridade">[]
                  ).map((p) => (
                    <option key={p} value={p}>
                      {PRIORIDADE_LABEL[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={afetaEdit}
                  onChange={(e) => setAfetaEdit(e.target.checked)}
                />
                Afeta a experiência do hóspede
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Quadro
                <select
                  value={ambienteEdit}
                  onChange={(e) => {
                    const proximo = e.target.value as "manutencao" | "ti";
                    setAmbienteEdit(proximo);
                    if (proximo !== "ti") {
                      setSistemaEdit("");
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="manutencao">Manutenção</option>
                  <option value="ti">TI</option>
                </select>
                <span className="mt-1 block font-normal text-slate-500">
                  Depois de salvar, o chamado fica nesse quadro.
                </span>
              </label>
              {erro && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {erro}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={ocupado}
                  className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {ocupado ? "Salvando…" : "Salvar"}
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    setTituloEdit(demanda.titulo);
                    setDescricaoEdit(demanda.descricao ?? "");
                    setSublocalEdit(demanda.sublocal ?? "");
                    setSistemaEdit(demanda.sistema_id ?? "");
                    setSolicitanteEdit(demanda.solicitante_id);
                    setPrioridadeEdit(demanda.prioridade);
                    setAfetaEdit(demanda.afeta_experiencia);
                    setAmbienteEdit(
                      demanda.ambiente === "ti" ||
                        demanda.ambiente === "manutencao"
                        ? demanda.ambiente
                        : ambiente,
                    );
                    setEditandoConteudo(false);
                    setErro(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {!editandoConteudo && demanda.descricao && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
              {demanda.descricao}
            </p>
          )}

          {ambiente === "ti" && (
            <ChatChamado
              demandaId={demanda.id}
              lado="equipe"
              podeEnviar={equipePodeMandarMensagem(
                demanda.colaborador_id,
                demanda.status,
              )}
            />
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {!editandoConteudo && (
              <Info rotulo="Solicitante" valor={demanda.solicitante?.nome} />
            )}
            <Info
              rotulo="Colaborador"
              valor={demanda.colaborador?.nome ?? "Sem responsável"}
            />
            <Info rotulo="Aberta em" valor={formatarData(demanda.criado_em)} />
            <Info
              rotulo="Atribuída em"
              valor={formatarData(demanda.atribuido_em)}
            />
            <Info
              rotulo="Iniciada em"
              valor={formatarData(demanda.iniciado_em)}
            />
            <Info
              rotulo="Concluída em"
              valor={formatarData(demanda.concluido_em)}
            />
            <Info
              rotulo="Prazo"
              valor={formatarData(demanda.prazo_confirmado)}
            />
            <Info
              rotulo="Acompanhamento"
              valor={
                demanda.token_acompanhamento ? (
                  <Link
                    href={`/acompanhar/${demanda.token_acompanhamento}`}
                    target="_blank"
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Abrir link
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </dl>

          {urgencia && (
            <span
              className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRAZO_COR[urgencia.nivel]}`}
            >
              {urgencia.label}
            </span>
          )}

          {demanda.motivo_nao_conclusao && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p>Motivo de não conclusão: {demanda.motivo_nao_conclusao}</p>
              {ehMotivoNaoPerturbe(demanda.motivo_nao_conclusao) &&
                anexos
                  .filter(
                    (a) => a.tipo === "foto" && a.enviado_por === "colaborador",
                  )
                  .slice(-1)
                  .map((a) => (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.url}
                        alt="Foto do não perturbe"
                        className="max-h-48 w-full rounded-lg object-cover"
                      />
                    </a>
                  ))}
            </div>
          )}

          <h3 className="mt-5 text-sm font-semibold text-slate-800">
            Andamento
          </h3>
          {carregando ? (
            <p className="mt-2 text-xs text-slate-400">Carregando histórico…</p>
          ) : historico.length === 0 ? (
            <ol className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
              <Passo
                quando={demanda.criado_em}
                texto="Demanda aberta"
              />
              {demanda.atribuido_em && (
                <Passo
                  quando={demanda.atribuido_em}
                  texto={`Atribuída${demanda.colaborador?.nome ? ` a ${demanda.colaborador.nome}` : ""}`}
                />
              )}
              {demanda.iniciado_em && (
                <Passo quando={demanda.iniciado_em} texto="Atendimento iniciado" />
              )}
              {demanda.concluido_em && (
                <Passo quando={demanda.concluido_em} texto="Concluída" />
              )}
            </ol>
          ) : (
            <ol className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
              {historico.map((h) => (
                <li key={h.id}>
                  <p className="text-sm font-medium text-slate-800">
                    {h.status_anterior
                      ? `${STATUS_LABEL[h.status_anterior]} → ${STATUS_LABEL[h.status_novo]}`
                      : STATUS_LABEL[h.status_novo]}
                  </p>
                  {h.observacao && (
                    <p className="text-xs text-slate-600">{h.observacao}</p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    {formatarData(h.criado_em)}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <h3 className="mt-5 text-sm font-semibold text-slate-800">Anexos</h3>
          {carregando ? (
            <p className="mt-2 text-xs text-slate-400">Carregando anexos…</p>
          ) : anexos.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">Nenhum anexo.</p>
          ) : (
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {anexos.map((a) => (
                <li key={a.id}>
                  {a.tipo === "foto" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a href={a.url} target="_blank" rel="noreferrer">
                      <img
                        src={a.url}
                        alt={`Anexo ${a.enviado_por}`}
                        className="h-28 w-full rounded-lg object-cover"
                      />
                    </a>
                  ) : (
                    <VideoAnexo url={a.url} />
                  )}
                  <p className="mt-1 text-[10px] text-slate-400">
                    {a.enviado_por} · {formatarData(a.criado_em)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {erro && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </div>

        <div className="grid gap-2 border-t border-slate-100 px-5 py-4">
          {demanda.status === "aguardando_validacao" && !arquivado && (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={aprovarConclusao}
                  disabled={ocupado}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {ocupado ? "Salvando…" : "Aprovar conclusão"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmandoDevolver(true);
                    setErro(null);
                  }}
                  disabled={ocupado}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Devolver
                </button>
              </div>
              {confirmandoDevolver && (
                <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <label className="text-xs font-medium text-slate-700">
                    Motivo da devolução <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={msgDevolucao}
                    onChange={(e) => setMsgDevolucao(e.target.value)}
                    rows={3}
                    placeholder="Explique o que falta ou o que precisa ser refeito…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  />
                  <button
                    type="button"
                    onClick={devolverParaAndamento}
                    disabled={ocupado}
                    className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {ocupado ? "Devolvendo…" : "Confirmar devolução"}
                  </button>
                </div>
              )}
            </div>
          )}

          {podePegarParaMim && (
            <button
              type="button"
              onClick={atribuirAMim}
              disabled={ocupado}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {ocupado ? "Atribuindo…" : "Atribuir a mim"}
            </button>
          )}

          {podeAtribuir && (
            <button
              type="button"
              onClick={onAtribuir}
              disabled={ocupado}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {demanda.status === "aberta"
                ? "Atribuir e definir prazo"
                : "Reatribuir / editar prazo"}
            </button>
          )}

          {podeConcluirAdmin && (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmandoConcluir((v) => !v);
                  setErro(null);
                }}
                disabled={ocupado}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {confirmandoConcluir
                  ? "Cancelar registro"
                  : ambiente === "ti"
                    ? "Registrar conclusão"
                    : "Marcar como concluída"}
              </button>
              {confirmandoConcluir && (
                <div className="grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <label className="text-xs font-medium text-emerald-900">
                    {ambiente === "ti"
                      ? "O que foi feito?"
                      : "Por que está concluindo agora?"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={msgConclusao}
                    onChange={(e) => setMsgConclusao(e.target.value)}
                    rows={3}
                    placeholder={
                      ambiente === "ti"
                        ? "Registre o atendimento feito neste chamado…"
                        : "Explique o motivo de fechar a demanda neste estágio…"
                    }
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <EscolherMidia
                    multiple
                    arquivoNome={
                      printsConclusao.length > 0
                        ? `${printsConclusao.length} print(s)`
                        : null
                    }
                    onEscolheu={(files) =>
                      setPrintsConclusao((atual) =>
                        [...atual, ...files].slice(0, 5),
                      )
                    }
                  />
                  {printsConclusao.length > 0 && (
                    <ul className="grid gap-1.5">
                      {printsConclusao.map((arquivo, i) => (
                        <li
                          key={`${arquivo.name}-${i}-${arquivo.size}`}
                          className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-700"
                        >
                          <span className="truncate">
                            {arquivo.name?.trim() || `Print ${i + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPrintsConclusao((atual) =>
                                atual.filter((_, idx) => idx !== i),
                              )
                            }
                            className="ml-2 shrink-0 text-slate-400 hover:text-red-600"
                            aria-label="Remover"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={concluirComoAdmin}
                    disabled={ocupado}
                    className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {ocupado
                      ? "Salvando…"
                      : ambiente === "ti"
                        ? "Registrar"
                        : "Confirmar conclusão"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => arquivar(!arquivado)}
              disabled={ocupado}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {ocupado
                ? "Salvando…"
                : arquivado
                  ? "Desarquivar"
                  : "Arquivar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmandoApagar((v) => !v);
                setTextoApagar("");
                setErro(null);
              }}
              disabled={ocupado}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {confirmandoApagar ? "Cancelar exclusão" : "Apagar"}
            </button>
          </div>

          {confirmandoApagar && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-medium text-red-800">
                Esta ação é permanente. Digite <strong>APAGAR</strong> para
                confirmar.
              </p>
              <input
                value={textoApagar}
                onChange={(e) => setTextoApagar(e.target.value)}
                placeholder="APAGAR"
                className="mt-2 w-full rounded-lg border border-red-200 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={apagar}
                disabled={ocupado || textoApagar !== "APAGAR"}
                className="mt-2 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
              >
                {ocupado ? "Apagando…" : "Confirmar exclusão"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {rotulo}
      </dt>
      <dd className="text-slate-800">{valor || "—"}</dd>
    </div>
  );
}

function Passo({ quando, texto }: { quando: string; texto: string }) {
  return (
    <li>
      <p className="text-sm font-medium text-slate-800">{texto}</p>
      <p className="text-[11px] text-slate-400">{formatarData(quando)}</p>
    </li>
  );
}
