import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import {
  conformidade,
  formatDataHora,
  inicioPeriodo,
  itensMaisReprovados,
  resumoPorCamareira,
  type Periodo,
} from "@/lib/governanca";
import { GovernancaShell } from "../../GovernancaShell";
import { Kpi, PrioridadeBadge, Titulo, Vazio } from "../../ui";

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
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/relatorios", true);
  const { periodo: bruto } = await searchParams;
  const periodo: Periodo = PERIODOS.some((p) => p.id === bruto) ? (bruto as Periodo) : "30";

  const supabase = await createClient();
  let query = supabase
    .from("gov_inspecoes")
    .select(
      "id, criado_em, gov_camareiras(nome), gov_respostas(id, resposta, pergunta_texto, gov_planos_acao(*))",
    )
    .order("criado_em", { ascending: false });
  const inicio = inicioPeriodo(periodo);
  if (inicio) query = query.gte("criado_em", inicio.toISOString());
  const { data } = await query;
  const inspecoes = data ?? [];

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
            href={`/governanca/admin/relatorios?periodo=${p.id}`}
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

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Inspeções" valor={inspecoes.length} cor="text-brand-700" />
        <Kpi titulo="Conformidade" valor={`${conformidade(totalSim, totalNao)}%`} cor="text-emerald-600" />
        <Kpi titulo="Não conformidades" valor={totalNao} cor="text-red-600" />
        <Kpi titulo="Planos de ação" valor={planos.length} cor="text-amber-600" />
      </div>

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
