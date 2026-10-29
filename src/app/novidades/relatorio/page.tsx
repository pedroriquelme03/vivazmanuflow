import { createClient } from "@/lib/supabase/server";
import { formatarPercentual, percentual } from "@/lib/novidades/calculos";
import { ABERTOS, SITUACAO_OS, dataBr, dataHoraBr, numeroOs } from "@/lib/novidades/formato";
import { Titulo, cardCls, inputCls, labelCls } from "../../governanca/ui";
import { exigirNovidades } from "../acesso";
import { CHAMADO_COMPLETO, type ChamadoCompleto } from "../chamados";
import { BotaoImprimir } from "../Comuns";
import { hojeSp } from "../dados";
import { ChecklistLocal, TextoLivre } from "../Editaveis";
import { NovidadesShell } from "../NovidadesShell";

export const dynamic = "force-dynamic";

const CHECKLIST_ENVIO = [
  "Unidade, área e ativo correspondem aos registros?",
  "A descrição informa o que foi executado, sem presumir ações?",
  "Datas e horários são coerentes entre as fontes?",
  "Anexos têm identificação e legenda, vinculados ao serviço?",
  "A situação combina com o resultado descrito?",
  "Toda pendência tem responsável e acompanhamento?",
  "Filtros e dados ausentes estão declarados?",
];

function ultimaAcao(c: ChamadoCompleto) {
  const h = [...c.historico]
    .filter((x) => x.observacao)
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0];
  return h?.observacao ?? null;
}

function completo(c: ChamadoCompleto) {
  return Boolean(c.colaborador && c.iniciado_em && c.concluido_em && c.anexos.length > 0);
}

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; criterio?: string }>;
}) {
  const perfil = await exigirNovidades("/novidades/relatorio");
  const hoje = hojeSp();
  const sp = await searchParams;
  const de = sp.de || `${hoje.slice(0, 7)}-01`;
  const ate = sp.ate || hoje;
  const criterio = sp.criterio === "conclusao" ? "conclusao" : "abertura";
  const campo = criterio === "conclusao" ? "concluido_em" : "criado_em";

  const supabase = await createClient();
  const [periodoRes, anterioresRes] = await Promise.all([
    supabase
      .from("demandas")
      .select(CHAMADO_COMPLETO)
      .eq("ambiente", "manutencao")
      .eq("arquivado", false)
      .gte(campo, `${de}T00:00:00-03:00`)
      .lte(campo, `${ate}T23:59:59-03:00`)
      .order(campo),
    supabase
      .from("demandas")
      .select("id, titulo, status, criado_em, sublocal, local:locais(nome), colaborador:usuarios!demandas_colaborador_id_fkey(nome)")
      .eq("ambiente", "manutencao")
      .eq("arquivado", false)
      .in("status", ABERTOS)
      .lt("criado_em", `${de}T00:00:00-03:00`)
      .order("criado_em"),
  ]);
  const lista = (periodoRes.data ?? []) as unknown as ChamadoCompleto[];
  const anteriores = anterioresRes.data ?? [];

  const concluidos = lista.filter((c) => c.status === "concluida");
  const cancelados = lista.filter((c) => c.status === "cancelada");
  const abertos = lista.filter((c) => ABERTOS.includes(c.status));
  const preventivas = lista.filter((c) => c.preventiva_id);
  const completos = concluidos.filter(completo);
  const unidades = [...new Set(lista.map((c) => c.propriedade?.nome).filter(Boolean))].join(", ");

  return (
    <NovidadesShell perfil={perfil} largo>
      <div className="print:hidden">
        <Titulo
          titulo="Relatório de manutenção"
          subtitulo="Monta o relatório do período a partir dos chamados, no modelo da Leankeep: recorte declarado, consolidado, serviços, pendências e checklist antes de enviar."
        />
        <form className={`${cardCls} grid gap-3 sm:grid-cols-4`}>
          <div>
            <label className={labelCls}>De</label>
            <input type="date" name="de" defaultValue={de} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Até</label>
            <input type="date" name="ate" defaultValue={ate} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Critério do recorte</label>
            <select name="criterio" defaultValue={criterio} className={inputCls}>
              <option value="abertura">Chamados abertos no período</option>
              <option value="conclusao">Chamados encerrados no período</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
              Gerar
            </button>
            <BotaoImprimir rotulo="Imprimir" />
          </div>
        </form>
      </div>

      <article className="mt-5 space-y-5 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Vivaz Cataratas · Manutenção</p>
            <h2 className="text-xl font-bold text-slate-800">Relatório de manutenção predial</h2>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-bold">RP-{de.replaceAll("-", "").slice(0, 6)} · versão 1</p>
            <p className="text-xs text-slate-500">Emitido em {dataHoraBr(new Date().toISOString())}</p>
          </div>
        </header>

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-800">A. Identificação e recorte</h3>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="inline text-slate-500">Unidade: </dt><dd className="inline">{unidades || "—"}</dd></div>
            <div><dt className="inline text-slate-500">Período: </dt><dd className="inline">{dataBr(de)} a {dataBr(ate)}</dd></div>
            <div><dt className="inline text-slate-500">Critério: </dt><dd className="inline">{criterio === "conclusao" ? "chamados encerrados no período" : "chamados abertos no período"}</dd></div>
            <div><dt className="inline text-slate-500">Data de corte: </dt><dd className="inline">{dataHoraBr(new Date().toISOString())}</dd></div>
            <div><dt className="inline text-slate-500">Sistemas: </dt><dd className="inline">Manutenção (todos os locais), chamados arquivados fora</dd></div>
            <div><dt className="inline text-slate-500">Elaborado por: </dt><dd className="inline">{perfil.nome}</dd></div>
          </dl>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Destinatário e finalidade</p>
              <TextoLivre linhas={2} placeholder="Ex.: Gerência do hotel, para acompanhar o mês e aprovar as pendências" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Síntese (resultado, restrição e encaminhamento)</p>
              <TextoLivre linhas={2} placeholder="Resumo curto do período" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-800">Consolidado do período</h3>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-6">
            {[
              ["Chamados", lista.length],
              ["Preventivas", preventivas.length],
              ["Concluídos", concluidos.length],
              ["Em aberto", abertos.length],
              ["Cancelados", cancelados.length],
              ["Pendências anteriores", anteriores.length],
            ].map(([t, v]) => (
              <div key={t} className="rounded-xl bg-slate-50 p-2">
                <p className="text-2xl font-bold text-slate-800">{v}</p>
                <p className="text-xs text-slate-500">{t}</p>
              </div>
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>
              <b>Execução integral:</b> {formatarPercentual(percentual(concluidos.length, lista.length))} (concluídos ÷
              todos do conjunto; cancelados continuam no total).
            </li>
            <li>
              <b>Registros completos:</b> {formatarPercentual(percentual(completos.length, concluidos.length))} dos
              concluídos têm responsável, início, término e evidência (análise total, não amostra).
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-800">B. Serviços, resultado e encaminhamento</h3>
          {lista.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum chamado no recorte.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">OS</th>
                    <th className="px-2 py-1.5">Local</th>
                    <th className="px-2 py-1.5">Demanda</th>
                    <th className="px-2 py-1.5">Serviço executado / pendência</th>
                    <th className="px-2 py-1.5">Evid.</th>
                    <th className="px-2 py-1.5">Responsável</th>
                    <th className="px-2 py-1.5">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((c) => (
                    <tr key={c.id} className="break-inside-avoid border-t border-slate-100 align-top">
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono">{numeroOs(c.id)}</td>
                      <td className="px-2 py-1.5">{[c.local?.nome, c.sublocal].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-2 py-1.5">
                        {c.preventiva_id && <span className="mr-1 rounded bg-brand-50 px-1 text-brand-700">PREV</span>}
                        {c.titulo}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600">
                        {c.motivo_nao_conclusao ? (
                          <span className="text-red-700">Não executado: {c.motivo_nao_conclusao}</span>
                        ) : (
                          ultimaAcao(c) ?? <span className="text-slate-400">não informado</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">{c.anexos.length || "—"}</td>
                      <td className="px-2 py-1.5">{c.colaborador?.nome ?? "—"}</td>
                      <td className="px-2 py-1.5">{SITUACAO_OS[c.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-brand-800">Pendências de antes do período</h3>
          {anteriores.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma pendência anterior em aberto.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {anteriores.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-x-2">
                  <span className="font-mono text-xs text-slate-500">{numeroOs(a.id)}</span>
                  <span>{a.titulo}</span>
                  <span className="text-xs text-slate-500">
                    aberta em {dataBr(a.criado_em)} · {(a.colaborador as { nome: string } | null)?.nome ?? "sem responsável"} ·{" "}
                    {SITUACAO_OS[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid grid-cols-2 gap-6 pt-6 text-center text-xs text-slate-500">
          <div>
            <div className="mb-1 h-8 border-b border-slate-500" />
            Elaborado por: {perfil.nome}
          </div>
          <div>
            <div className="mb-1 h-8 border-b border-slate-500" />
            Ciência / aceite
          </div>
        </section>
      </article>

      <section className={`${cardCls} mt-5 print:hidden`}>
        <h2 className="mb-2 font-bold text-slate-800">Checklist antes de enviar</h2>
        <ChecklistLocal itens={CHECKLIST_ENVIO} />
        <p className="mt-3 text-xs text-slate-500">
          Se algo mudar depois do envio, emita uma nova versão e explique o que mudou, sem reaproveitar o mesmo número.
        </p>
      </section>
    </NovidadesShell>
  );
}
