"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { DemandaKanban } from "@/lib/demanda-select";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  formatarData,
  calcularUrgencia,
  PRAZO_COR,
} from "@/lib/demanda-ui";
import { PrioridadeTag } from "@/components/PrioridadeTag";
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
  onFechar,
  onAtribuir,
  onAtualizou,
}: {
  demanda: DemandaKanban;
  agora: number;
  onFechar: () => void;
  onAtribuir: () => void;
  onAtualizou: () => void;
}) {
  const supabase = createClient();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [anexos, setAnexos] = useState<AnexoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [textoApagar, setTextoApagar] = useState("");

  const arquivado = Boolean(demanda.arquivado);
  const podeAtribuir =
    !arquivado &&
    (demanda.status === "aberta" ||
      demanda.status === "atribuida" ||
      demanda.status === "em_andamento");

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

  async function arquivar(valor: boolean) {
    setErro(null);
    setOcupado(true);
    const { error } = await supabase
      .from("demandas")
      .update({ arquivado: valor })
      .eq("id", demanda.id);
    setOcupado(false);
    if (error) {
      if (
        error.message.includes("arquivado") ||
        error.message.includes("schema cache")
      ) {
        setErro(
          "Rode o SQL em supabase/migrations/20260813190000_demandas_arquivar_apagar.sql no Supabase.",
        );
        return;
      }
      setErro(error.message);
      return;
    }
    onAtualizou();
  }

  async function apagar() {
    if (textoApagar !== "APAGAR") return;
    setErro(null);
    setOcupado(true);
    const { error } = await supabase.rpc("apagar_demanda", { p_id: demanda.id });
    setOcupado(false);
    if (error) {
      if (
        error.message.includes("Could not find") ||
        error.message.includes("function") ||
        error.message.includes("schema cache")
      ) {
        setErro(
          "Rode o SQL em supabase/migrations/20260813190000_demandas_arquivar_apagar.sql no Supabase.",
        );
        return;
      }
      setErro(error.message);
      return;
    }
    onAtualizou();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">
              {demanda.titulo}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {[demanda.propriedade?.nome, demanda.local?.nome]
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

          {demanda.afeta_experiencia && (
            <p className="mt-2 text-xs font-semibold text-red-600">
              Afeta a experiência do hóspede
            </p>
          )}

          {demanda.evento?.nome && (
            <p className="mt-2 text-xs font-semibold text-violet-700">
              🎉 Evento: {demanda.evento.nome}
            </p>
          )}

          {demanda.descricao && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
              {demanda.descricao}
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <Info rotulo="Solicitante" valor={demanda.solicitante?.nome} />
            <Info rotulo="Colaborador" valor={demanda.colaborador?.nome} />
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
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Motivo de não conclusão: {demanda.motivo_nao_conclusao}
            </p>
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
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-28 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-600"
                    >
                      Ver vídeo
                    </a>
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
