import { CAMPOS_PLANO, type CampoPlano } from "@/lib/checklist-plano";
import { nomeDoAnexo, tipoAnexo } from "@/lib/checklist-anexo";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import {
  agruparPorGrupo,
  agruparPorSecao,
  corNota,
  formatDataHora,
  formatarDuracao,
  formatarValor,
  inspecionaEquipe,
  rotuloTipo,
} from "@/lib/governanca";
import { cuidaDoSetor } from "@/lib/checklist-setores";
import { duracaoMinutos, emAberto, formatarDataCurta } from "@/lib/checklist-inspecao";
import { notaPonderada } from "@/lib/checklist-regras";
import { AcoesInspecao } from "../../AcoesInspecao";
import { GovernancaShell } from "../../GovernancaShell";
import { carregarSetoresDaPessoa } from "../../setores-dados";
import { PrioridadeBadge, StatusBadge, Vazio, cardCls } from "../../ui";
import { ResolverPlano } from "./ResolverPlano";

export const dynamic = "force-dynamic";

export default async function InspecaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { perfil, papel } = await exigirGovernanca(`/governanca/inspecao/${id}`);

  const supabase = await createClient();
  const [{ data: insp }, { data: respostas }, { meusSetores }] = await Promise.all([
    supabase
      .from("gov_inspecoes")
      .select(
        "*, gov_acomodacoes(numero, tipo), gov_camareiras(nome), usuarios(nome), gov_processos(nome, setor_id)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("gov_respostas")
      .select("*, gov_planos_acao(*)")
      .eq("inspecao_id", id),
    carregarSetoresDaPessoa(supabase, perfil.id, papel),
  ]);
  const duracao = insp ? duracaoMinutos(insp.criado_em, insp.finalizada_em) : null;

  const lista = respostas ?? [];
  const grupos = agruparPorSecao(lista.map((r) => ({ ...r, grupo: r.pergunta_grupo })));
  const totalSim = lista.filter((r) => r.resposta === "sim").length;
  const totalNao = lista.filter((r) => r.resposta === "nao").length;
  // Nota com o peso de cada pergunta guardado na resposta (respostas antigas valem 1).
  const nota = notaPonderada(lista.map((r) => ({ resposta: r.resposta, peso: Number(r.pergunta_peso ?? 1) })));

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <Link
        href={inspecionaEquipe(papel) ? "/governanca/admin/kanban" : "/governanca"}
        className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800"
      >
        ← {inspecionaEquipe(papel) ? "Voltar ao Kanban" : "Voltar"}
      </Link>
      {insp && (
        <AcoesInspecao
          inspecao={insp}
          eu={perfil.id}
          cuidaDoSetor={cuidaDoSetor(papel, insp.gov_processos?.setor_id, meusSetores)}
          depoisDeExcluir={inspecionaEquipe(papel) ? "/governanca/admin/inspecoes" : "/governanca"}
        />
      )}

      {!insp ? (
        <Vazio texto="Inspeção não encontrada." />
      ) : (
        <>
          <div className={`${cardCls} mb-4`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                {insp.gov_acomodacoes ? (
                  <>
                    <p className="text-2xl font-bold text-slate-800">
                      {insp.gov_acomodacoes.tipo === "area" ? "" : "UH "}
                      {insp.gov_acomodacoes.numero}
                    </p>
                    <p className="text-sm text-slate-500">
                      {rotuloTipo(insp.tipo ?? insp.gov_acomodacoes.tipo)} · {insp.gov_processos?.nome}
                      {insp.identificacao ? ` · ${insp.identificacao}` : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-slate-800">{insp.gov_processos?.nome}</p>
                    {insp.identificacao && <p className="text-sm text-slate-500">{insp.identificacao}</p>}
                  </>
                )}
              </div>
              <StatusBadge status={insp.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {insp.gov_camareiras && <Info rotulo="Colaborador" valor={insp.gov_camareiras.nome} />}
              <Info rotulo="Aplicado por" valor={insp.usuarios?.nome ?? "—"} />
              <Info rotulo="Data do checklist" valor={formatarDataCurta(insp.data_referencia)} />
              <Info rotulo="Início" valor={formatDataHora(insp.criado_em)} />
              {insp.finalizada_em && <Info rotulo="Fim" valor={formatDataHora(insp.finalizada_em)} />}
              {duracao !== null && <Info rotulo="Duração" valor={formatarDuracao(duracao)} />}
              {totalSim + totalNao > 0 && (
                <Info rotulo="Conformidade" valor={`${totalSim} sim · ${totalNao} não`} />
              )}
            </dl>
            {nota !== null && insp.status === "finalizada" && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Nota da vistoria</span>
                <span className={`text-3xl font-bold ${corNota(nota)}`}>
                  {nota}
                  <span className="text-base font-medium text-slate-400"> / 100</span>
                </span>
              </div>
            )}
          </div>

          {grupos.map((g) => (
            <section key={`${g.ordem}-${g.nome}`} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {g.nome}
              </h3>
              <div className="space-y-2">
                {agruparPorGrupo(g.itens).flatMap((sub, si) => [
                  sub.grupo ? (
                    <p key={`g-${si}`} className="pt-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {sub.grupo}
                    </p>
                  ) : null,
                  ...sub.itens.map((r) => (
                  <div key={r.id} className={cardCls}>
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                          r.resposta === "sim"
                            ? "bg-brand-600"
                            : r.resposta === "nao"
                              ? "bg-red-600"
                              : r.pergunta_tipo === "sim_nao" || r.resposta === "na"
                                ? "bg-slate-400"
                                : "bg-brand-600"
                        }`}
                      >
                        {r.resposta === "sim"
                          ? "✓"
                          : r.resposta === "nao"
                            ? "✕"
                            : r.resposta === "na"
                              ? "–"
                              : r.pergunta_tipo === "sim_nao"
                                ? "?"
                                : "•"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{r.pergunta_texto}</p>
                        {r.resposta === "na" && <p className="mt-1 text-sm text-slate-500">Não se aplica</p>}
                        {r.pergunta_tipo !== "sim_nao" && r.resposta !== "na" && (
                          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                            {formatarValor(r.pergunta_tipo, r.valor)}
                          </p>
                        )}
                        {r.comentario && <p className="mt-1 text-sm text-slate-500">{r.comentario}</p>}
                        {(r.item_previsto || r.item_diferente) && (
                          <p className={`mt-1 text-xs ${r.item_diferente ? "font-semibold text-amber-700" : "text-slate-500"}`}>
                            Cadastro: {r.item_previsto ?? "nada cadastrado"}
                            {r.item_diferente && <> · ⚠ encontrado: {r.item_encontrado ?? "—"}</>}
                          </p>
                        )}
                        {r.anexo_url && <AnexoDaResposta url={r.anexo_url} />}
                        {r.gov_planos_acao.map((p) => (
                          <div key={p.id} className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="font-semibold text-red-800">Chamado para manutenção</span>
                              <PrioridadeBadge prioridade={p.prioridade} />
                            </div>
                            <p className="text-slate-700">{p.o_que_fazer}</p>
                            <ExtrasDoPlano plano={p} />
                            <p className="mt-1 text-xs text-slate-500">
                              {p.quem_vai_fazer && <>Responsável: {p.quem_vai_fazer}. </>}
                              {p.quem_pediu && <>Solicitante: {p.quem_pediu}.</>}
                            </p>
                            {p.observacao && <p className="mt-1 text-xs text-slate-500">Obs.: {p.observacao}</p>}
                            {p.chamado_token ? (
                              <Link
                                href={`/acompanhar/${p.chamado_token}`}
                                className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
                              >
                                🔧 Chamado aberto na Manutenção · acompanhar
                              </Link>
                            ) : (
                              emAberto(insp.status) && (
                                <p className="mt-1 text-xs text-slate-500">
                                  O chamado na Manutenção é aberto quando o checklist for finalizado.
                                </p>
                              )
                            )}
                            {insp.status === "finalizada" && (
                              <ResolverPlano
                                planoId={p.id}
                                resolvidoEm={p.resolvido_em ?? null}
                                usuarioId={perfil.id}
                                podeResolver={inspecionaEquipe(papel)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  )),
                ])}
              </div>
            </section>
          ))}
        </>
      )}
    </GovernancaShell>
  );
}

/** Anexo da pergunta: foto em miniatura, vídeo com player e documento como link. */
function AnexoDaResposta({ url }: { url: string }) {
  const tipo = tipoAnexo(url);
  if (tipo === "video") {
    return <video src={url} controls className="mt-2 max-h-48 w-full max-w-xs rounded-lg bg-black ring-1 ring-slate-200" />;
  }
  if (tipo === "documento") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-slate-100"
      >
        📄 {nomeDoAnexo(url)}
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- foto do Storage */}
      <img src={url} alt="Foto do item" className="mt-2 h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200" />
    </a>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{rotulo}</dt>
      <dd className="font-medium text-slate-800">{valor}</dd>
    </div>
  );
}

/** Prazo, onde, por quê, como e custo do plano, quando foram preenchidos. */
function ExtrasDoPlano({ plano }: { plano: Partial<Record<CampoPlano, string | number | null>> }) {
  const preenchidos = CAMPOS_PLANO.filter((c) => plano[c.campo] !== null && plano[c.campo] !== undefined && plano[c.campo] !== "");
  if (preenchidos.length === 0) return null;
  const mostrar = (campo: CampoPlano, valor: string | number) => {
    if (campo === "prazo") {
      const [a, m, d] = String(valor).slice(0, 10).split("-");
      return `${d}/${m}/${a}`;
    }
    if (campo === "custo") return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return String(valor);
  };
  return (
    <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-xs text-slate-600 sm:grid-cols-2">
      {preenchidos.map((c) => (
        <div key={c.campo} className="min-w-0 break-words">
          <dt className="inline font-semibold">{c.rotulo}: </dt>
          <dd className="inline">{mostrar(c.campo, plano[c.campo] as string | number)}</dd>
        </div>
      ))}
    </dl>
  );
}
