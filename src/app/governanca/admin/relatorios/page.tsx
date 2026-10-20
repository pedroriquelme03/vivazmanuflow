import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import {
  MINUTOS_PARADO,
  conformidade,
  formatDataHora,
  formatarDuracao,
  indicadoresAndamento,
  inicioPeriodo,
  itensMaisReprovados,
  resumoPorAplicador,
  resumoPorCamareira,
  type Periodo,
} from "@/lib/governanca";
import { GovernancaShell } from "../../GovernancaShell";
import { Kpi, PrioridadeBadge, Titulo, Vazio, btnSecundario, inputCls } from "../../ui";

export const dynamic = "force-dynamic";

const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: "7", rotulo: "7 dias" },
  { id: "30", rotulo: "30 dias" },
  { id: "90", rotulo: "90 dias" },
  { id: "todos", rotulo: "Todo o período" },
];

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; checklist?: string }>;
}) {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/relatorios", true);
  const { periodo: bruto, checklist } = await searchParams;
  const periodo: Periodo = PERIODOS.some((p) => p.id === bruto) ? (bruto as Periodo) : "30";

  const supabase = await createClient();
  let query = supabase
    .from("gov_inspecoes")
    .select(
      "id, status, criado_em, finalizada_em, processo_id, gov_processos(nome), gov_camareiras(nome), usuarios(nome), gov_respostas(id, resposta, pergunta_texto, gov_planos_acao(*))",
    )
    .order("criado_em", { ascending: false });
  const inicio = inicioPeriodo(periodo);
  if (inicio) query = query.gte("criado_em", inicio.toISOString());
  if (checklist) query = query.eq("processo_id", checklist);
  const [{ data }, { data: processos }] = await Promise.all([
    query,
    supabase.from("gov_processos").select("id, nome, categoria").order("nome"),
  ]);
  const todas = data ?? [];
  // Conformidade e planos contam só o que já foi finalizado.
  const inspecoes = todas.filter((i) => i.status === "finalizada");
  const andamento = indicadoresAndamento(
    todas.map((i) => ({ ...i, aplicador: i.usuarios?.nome ?? null })),
    todas.flatMap((i) => i.gov_respostas.flatMap((r) => r.gov_planos_acao)),
  );
  const porAplicador = resumoPorAplicador(
    todas.map((i) => ({ ...i, aplicador: i.usuarios?.nome ?? null })),
    inspecoes.flatMap((i) => i.gov_respostas.map((r) => ({ ...r, inspecao_id: i.id }))),
  );

  const respostas = inspecoes.flatMap((i) =>
    i.gov_respostas.map((r) => ({ ...r, inspecao_id: i.id })),
  );
  const planos = respostas
    .flatMap((r) =>
      r.gov_planos_acao.map((p) => ({ ...p, inspecao_id: r.inspecao_id, item: r.pergunta_texto })),
    )
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));

  const totalSim = respostas.filter((r) => r.resposta === "sim").length;
  const totalNao = respostas.filter((r) => r.resposta === "nao").length;
  const porCamareira = resumoPorCamareira(
    inspecoes.map((i) => ({ id: i.id, camareira: i.gov_camareiras?.nome ?? null })),
    respostas,
  );
  const reprovados = itensMaisReprovados(respostas);
  const comCamareira = inspecoes.some((i) => i.gov_camareiras);

  const porChecklist = [...inspecoes.reduce((mapa, i) => {
    const nome = i.gov_processos?.nome ?? "Checklist";
    const linha = mapa.get(i.processo_id) ?? { id: i.processo_id, nome, inspecoes: 0, sim: 0, nao: 0 };
    linha.inspecoes += 1;
    for (const r of i.gov_respostas) {
      if (r.resposta === "sim") linha.sim += 1;
      if (r.resposta === "nao") linha.nao += 1;
    }
    return mapa.set(i.processo_id, linha);
  }, new Map<string, { id: string; nome: string; inspecoes: number; sim: number; nao: number }>()).values()]
    .sort((a, b) => b.inspecoes - a.inspecoes);

  const linkPeriodo = (id: string) =>
    `/governanca/admin/relatorios?periodo=${id}${checklist ? `&checklist=${checklist}` : ""}`;
  const maxReprovado = reprovados[0]?.qtd ?? 1;

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <Titulo
        titulo="Relatórios"
        subtitulo="Indicadores das inspeções, não conformidades e planos de ação."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <Link
            key={p.id}
            href={linkPeriodo(p.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              periodo === p.id
                ? "bg-brand-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {p.rotulo}
          </Link>
        ))}
      </div>

      <form method="get" className="mb-6 flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="periodo" value={periodo} />
        <select name="checklist" defaultValue={checklist ?? ""} className={`${inputCls} sm:max-w-md`}>
          <option value="">Todos os checklists</option>
          {(processos ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.categoria ? `${p.categoria} · ` : ""}
              {p.nome}
            </option>
          ))}
        </select>
        <button type="submit" className={btnSecundario}>
          Filtrar
        </button>
      </form>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Inspeções finalizadas" valor={inspecoes.length} cor="text-brand-700" />
        <Kpi titulo="Conformidade" valor={`${conformidade(totalSim, totalNao)}%`} cor="text-brand-600" />
        <Kpi titulo="Não conformidades" valor={totalNao} cor="text-red-600" />
        <Kpi titulo="Planos de ação" valor={planos.length} cor="text-amber-600" />
      </div>

      <Secao titulo="Andamento">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi titulo="Em andamento" valor={andamento.emAndamento} cor="text-amber-600" />
          <Kpi
            titulo={`Parados há mais de ${MINUTOS_PARADO / 60} h`}
            valor={andamento.parados}
            cor={andamento.parados > 0 ? "text-red-600" : "text-slate-500"}
          />
          <Kpi
            titulo="Tempo médio de preenchimento"
            valor={formatarDuracao(andamento.tempoPreenchimento)}
            cor="text-slate-800"
          />
          <Kpi titulo="Pendências abertas" valor={andamento.planosAbertos} cor="text-red-600" />
          <Kpi titulo="Pendências resolvidas" valor={andamento.planosResolvidos} cor="text-brand-700" />
          <Kpi
            titulo="Tempo médio até resolver"
            valor={formatarDuracao(andamento.tempoResolucao)}
            cor="text-slate-800"
          />
        </div>
        <Link
          href="/governanca/admin/kanban"
          className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
        >
          Ver no Kanban →
        </Link>
      </Secao>

      <Secao titulo="Por aplicador">
        {porAplicador.length === 0 ? (
          <Vazio texto="Nenhuma inspeção no período." />
        ) : (
          <Tabela>
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Aplicador</th>
                <th className="px-4 py-3 font-medium">Finalizadas</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Em andamento</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Tempo médio</th>
                <th className="px-4 py-3 font-medium">Conformidade</th>
              </tr>
            </thead>
            <tbody>
              {porAplicador.map((a) => (
                <tr key={a.nome} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{a.nome}</td>
                  <td className="px-4 py-3">{a.finalizadas}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">{a.emAndamento}</td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                    {formatarDuracao(a.tempoMedio)}
                  </td>
                  <td className="px-4 py-3">
                    {a.sim + a.nao > 0 ? `${conformidade(a.sim, a.nao)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Secao>

      {!checklist && (
        <Secao titulo="Por checklist">
          {porChecklist.length === 0 ? (
            <Vazio texto="Nenhuma inspeção no período." />
          ) : (
            <Tabela>
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Checklist</th>
                  <th className="px-4 py-3 font-medium">Inspeções</th>
                  <th className="px-4 py-3 font-medium">Não</th>
                  <th className="px-4 py-3 font-medium">Conformidade</th>
                </tr>
              </thead>
              <tbody>
                {porChecklist.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <Link href={`/governanca/admin/relatorios?periodo=${periodo}&checklist=${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c.inspecoes}</td>
                    <td className="px-4 py-3">{c.nao}</td>
                    <td className="px-4 py-3">{c.sim + c.nao > 0 ? `${conformidade(c.sim, c.nao)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
        </Secao>
      )}

      {comCamareira && (
      <Secao titulo="Por camareira">
        {porCamareira.length === 0 ? (
          <Vazio texto="Nenhuma inspeção no período." />
        ) : (
          <Tabela>
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Camareira</th>
                <th className="px-4 py-3 font-medium">Inspeções</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Sim</th>
                <th className="px-4 py-3 font-medium">Não</th>
                <th className="px-4 py-3 font-medium">Conformidade</th>
              </tr>
            </thead>
            <tbody>
              {porCamareira.map((c) => (
                <tr key={c.nome} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3">{c.inspecoes}</td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{c.sim}</td>
                  <td className="px-4 py-3">{c.nao}</td>
                  <td className="px-4 py-3">{conformidade(c.sim, c.nao)}%</td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Secao>
      )}

      <Secao titulo="Itens mais reprovados">
        {reprovados.length === 0 ? (
          <Vazio texto="Nenhuma não conformidade no período." />
        ) : (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            {reprovados.map((item) => (
              <div key={item.texto}>
                <div className="mb-1 flex items-start justify-between gap-3 text-sm">
                  <p className="font-medium">{item.texto}</p>
                  <span className="shrink-0 text-slate-500">{item.qtd}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${(item.qtd / maxReprovado) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Planos de ação">
        {planos.length === 0 ? (
          <Vazio texto="Nenhum plano de ação no período." />
        ) : (
          <Tabela>
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">O que fazer</th>
                <th className="px-4 py-3 font-medium">Prioridade</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Responsável</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Data</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/governanca/inspecao/${p.inspecao_id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {p.item}
                    </Link>
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-slate-500 md:table-cell">
                    {p.o_que_fazer}
                  </td>
                  <td className="px-4 py-3">
                    <PrioridadeBadge prioridade={p.prioridade} />
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{p.quem_vai_fazer ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{formatDataHora(p.criado_em)}</td>
                  <td className="px-4 py-3">
                    {p.resolvido_em ? (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        Resolvido
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        Aberto
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Secao>
    </GovernancaShell>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {children}
    </section>
  );
}

function Tabela({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
