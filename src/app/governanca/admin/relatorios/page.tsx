import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import {
  MINUTOS_PARADO,
  formatDataHora,
  formatarDuracao,
  indicadoresAndamento,
  itensMaisReprovados,
} from "@/lib/governanca";
import { resumoPorModelo } from "@/lib/checklist-patrimonio";
import { formatarDataCurta, hojeEmSaoPaulo, STATUS_INSPECAO } from "@/lib/checklist-inspecao";
import { setoresPorPropriedade } from "@/lib/checklist-setores";
import {
  abertosComTempo,
  atalhoAtivo,
  atalhosPeriodo,
  filtrarRelatorio,
  lerFiltrosRelatorio,
  linkRelatorio,
  resumoPor,
  resumoPorDia,
  totaisRelatorio,
  type FiltrosRelatorio,
  type InspecaoRelatorio,
  type LinhaResumo,
} from "@/lib/checklist-relatorios";
import { GovernancaShell } from "../../GovernancaShell";
import { carregarSetores } from "../../setores-dados";
import { AbasRelatorios, Kpi, PrioridadeBadge, StatusBadge, Titulo, Vazio, btnPrimario, btnSecundario, inputCls } from "../../ui";

export const dynamic = "force-dynamic";

type Params = Partial<Record<keyof FiltrosRelatorio, string>>;

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/relatorios", true);
  const hoje = hojeEmSaoPaulo();
  const f = lerFiltrosRelatorio(await searchParams, hoje);

  const supabase = await createClient();
  let query = supabase
    .from("gov_inspecoes")
    .select(
      "id, status, criado_em, finalizada_em, data_referencia, processo_id, camareira_id, inspetor_id, gov_processos(nome, setor_id), gov_acomodacoes(numero), gov_camareiras(nome), usuarios(nome), gov_respostas(id, resposta, pergunta_texto, item_previsto, item_diferente, item_encontrado, gov_planos_acao(*))",
    )
    .order("criado_em", { ascending: false });
  if (f.de) query = query.gte("data_referencia", f.de);
  if (f.ate) query = query.lte("data_referencia", f.ate);
  const [{ data }, { setores, propriedades }, { data: processos }, { data: colaboradores }, { data: equipe }] =
    await Promise.all([
      query,
      carregarSetores(supabase),
      supabase.from("gov_processos").select("id, nome, setor_id").order("nome"),
      supabase.from("gov_camareiras").select("id, nome, setor_id").order("nome"),
      supabase.rpc("checklist_equipe"),
    ]);

  const brutas = data ?? [];
  const linhas: InspecaoRelatorio[] = brutas.map((i) => ({
    id: i.id,
    status: i.status,
    criadoEm: i.criado_em,
    finalizadaEm: i.finalizada_em,
    dataReferencia: i.data_referencia,
    checklistId: i.processo_id,
    checklist: i.gov_processos?.nome ?? "Checklist",
    setorId: i.gov_processos?.setor_id ?? null,
    colaboradorId: i.camareira_id,
    colaborador: i.gov_camareiras?.nome ?? null,
    aplicadorId: i.inspetor_id,
    aplicador: i.usuarios?.nome ?? null,
    local: i.gov_acomodacoes?.numero ?? null,
    sim: i.gov_respostas.filter((r) => r.resposta === "sim").length,
    nao: i.gov_respostas.filter((r) => r.resposta === "nao").length,
    planos: i.gov_respostas.reduce((s, r) => s + r.gov_planos_acao.length, 0),
  }));
  const filtradas = filtrarRelatorio(linhas, f);
  const ids = new Set(filtradas.map((i) => i.id));
  const escolhidas = brutas.filter((i) => ids.has(i.id));
  const finalizadas = escolhidas.filter((i) => i.status === "finalizada");

  const totais = totaisRelatorio(filtradas);
  const andamento = indicadoresAndamento(
    escolhidas.map((i) => ({ ...i, aplicador: i.usuarios?.nome ?? null })),
    escolhidas.flatMap((i) => i.gov_respostas.flatMap((r) => r.gov_planos_acao)),
  );
  const abertos = abertosComTempo(filtradas);
  const porColaborador = resumoPor(filtradas, (i) => ({ id: i.colaboradorId, nome: i.colaborador }), "Sem colaborador");
  const porAplicador = resumoPor(filtradas, (i) => ({ id: i.aplicadorId, nome: i.aplicador }), "Sem nome");
  const porChecklist = resumoPor(filtradas, (i) => ({ id: i.checklistId, nome: i.checklist }), "Checklist");
  const porDia = resumoPorDia(filtradas);

  const respostas = finalizadas.flatMap((i) => i.gov_respostas.map((r) => ({ ...r, inspecao_id: i.id })));
  const planos = respostas
    .flatMap((r) => r.gov_planos_acao.map((p) => ({ ...p, inspecao_id: r.inspecao_id, item: r.pergunta_texto })))
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const reprovados = itensMaisReprovados(respostas);
  const maxReprovado = reprovados[0]?.qtd ?? 1;
  const porModelo = resumoPorModelo(respostas);
  const divergencias = finalizadas.flatMap((i) =>
    i.gov_respostas
      .filter((r) => r.item_diferente)
      .map((r) => ({ ...r, inspecaoId: i.id, checklist: i.gov_processos?.nome ?? "Checklist", local: i.gov_acomodacoes?.numero ?? null })),
  );

  const aplicadores = (equipe ?? []).length
    ? (equipe ?? []).map((p) => ({ id: p.id, nome: p.nome }))
    : [...new Map(linhas.map((i) => [i.aplicadorId, { id: i.aplicadorId, nome: i.aplicador ?? "Sem nome" }])).values()];
  const algumFiltro = Boolean(f.setor || f.checklist || f.colaborador || f.aplicador || f.status);
  const periodoTexto =
    f.de && f.ate
      ? f.de === f.ate
        ? `em ${formatarDataCurta(f.de)}`
        : `de ${formatarDataCurta(f.de)} a ${formatarDataCurta(f.ate)}`
      : f.de
        ? `desde ${formatarDataCurta(f.de)}`
        : f.ate
          ? `até ${formatarDataCurta(f.ate)}`
          : "em todo o período";

  return (
    <GovernancaShell perfil={perfil} papel={papel} largo>
      <AbasRelatorios atual="indicadores" />
      <Titulo titulo="Relatórios" subtitulo="Indicadores das inspeções, colaboradores, tempos e planos de ação." />

      <div className="mb-4 flex flex-wrap gap-2">
        {atalhosPeriodo(hoje).map((a) => (
          <Link
            key={a.id}
            href={linkRelatorio(f, { de: a.de, ate: a.ate })}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              atalhoAtivo(f, hoje) === a.id
                ? "bg-brand-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      <form method="get" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo rotulo="De">
            <input className={inputCls} type="date" name="de" defaultValue={f.de} max={hoje} />
          </Campo>
          <Campo rotulo="Até">
            <input className={inputCls} type="date" name="ate" defaultValue={f.ate} max={hoje} />
          </Campo>
          <Campo rotulo="Setor">
            <select className={inputCls} name="setor" defaultValue={f.setor}>
              <option value="">Todos os setores</option>
              {setoresPorPropriedade(setores, propriedades).map((g) => (
                <optgroup key={g.propriedade.id} label={g.propriedade.nome}>
                  {g.setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Checklist">
            <select className={inputCls} name="checklist" defaultValue={f.checklist}>
              <option value="">Todos os checklists</option>
              {(processos ?? [])
                .filter((p) => !f.setor || p.setor_id === f.setor)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo rotulo="Colaborador avaliado">
            <select className={inputCls} name="colaborador" defaultValue={f.colaborador}>
              <option value="">Todos</option>
              {(colaboradores ?? [])
                .filter((c) => !f.setor || c.setor_id === f.setor)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo rotulo="Quem aplicou">
            <select className={inputCls} name="aplicador" defaultValue={f.aplicador}>
              <option value="">Todos</option>
              {aplicadores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Status">
            <select className={inputCls} name="status" defaultValue={f.status}>
              <option value="">Todos</option>
              {STATUS_INSPECAO.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <div className="flex items-end gap-2">
            <button type="submit" className={`${btnPrimario} flex-1`}>
              Filtrar
            </button>
            {algumFiltro && (
              <Link href={linkRelatorio({ ...f, setor: "", checklist: "", colaborador: "", aplicador: "", status: "" })} className={btnSecundario}>
                Limpar
              </Link>
            )}
          </div>
        </div>
      </form>

      <p className="mb-3 text-sm text-slate-500">
        {filtradas.length} {filtradas.length === 1 ? "checklist" : "checklists"} {periodoTexto}
        {algumFiltro ? " com os filtros" : ""}.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Finalizados" valor={totais.finalizadas} cor="text-brand-700" />
        <Kpi titulo="Conformidade" valor={totais.conformidade === null ? "—" : `${totais.conformidade}%`} cor="text-brand-600" />
        <Kpi titulo="Não conformidades" valor={totais.nao} cor="text-red-600" />
        <Kpi titulo="Planos de ação" valor={totais.planos} cor="text-amber-600" />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Em aberto" valor={totais.abertas} cor="text-amber-600" />
        <Kpi
          titulo={`Parados há mais de ${MINUTOS_PARADO / 60} h`}
          valor={andamento.parados}
          cor={andamento.parados > 0 ? "text-red-600" : "text-slate-500"}
        />
        <Kpi titulo="Tempo médio para fazer" valor={formatarDuracao(totais.tempoMedio)} cor="text-slate-800" />
        <Kpi titulo="Pendências abertas" valor={andamento.planosAbertos} cor="text-red-600" />
      </div>

      <Secao titulo={`Em aberto agora (${abertos.length})`}>
        {abertos.length === 0 ? (
          <Vazio texto="Nenhum checklist em aberto com esses filtros." />
        ) : (
          <Tabela>
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Checklist</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Quem aplica</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Começou</th>
                <th className="px-4 py-3 font-medium">Aberto há</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {abertos.map((i) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/governanca/inspecao/${i.id}`} className="font-medium text-brand-700 hover:underline">
                      {i.checklist}
                    </Link>
                    <span className="block text-xs text-slate-400">
                      {[i.local && `Local ${i.local}`, i.colaborador].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{i.aplicador ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{formatDataHora(i.criadoEm)}</td>
                  <td
                    className={`px-4 py-3 font-semibold ${
                      i.status === "em_andamento" && i.minutosAberto > MINUTOS_PARADO ? "text-red-600" : "text-slate-700"
                    }`}
                  >
                    {formatarDuracao(i.minutosAberto)}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Secao>

      <Secao titulo="Por colaborador avaliado">
        <TabelaResumo
          linhas={porColaborador}
          rotulo="Colaborador"
          link={(l) => (l.id ? linkRelatorio(f, { colaborador: l.id }) : null)}
        />
      </Secao>

      <Secao titulo="Por quem aplicou">
        <TabelaResumo linhas={porAplicador} rotulo="Quem aplicou" link={(l) => (l.id ? linkRelatorio(f, { aplicador: l.id }) : null)} />
      </Secao>

      {!f.checklist && (
        <Secao titulo="Por checklist">
          <TabelaResumo linhas={porChecklist} rotulo="Checklist" link={(l) => linkRelatorio(f, { checklist: l.id })} />
        </Secao>
      )}

      <Secao titulo="Por dia">
        {porDia.length === 0 ? (
          <Vazio texto="Nenhum checklist no período." />
        ) : (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            {porDia.map((d) => {
              const max = Math.max(...porDia.map((x) => x.finalizadas + x.abertas), 1);
              return (
                <Link
                  key={d.data}
                  href={linkRelatorio(f, { de: d.data, ate: d.data })}
                  className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 rounded-lg px-1 py-1 text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-700">{formatarDataCurta(d.data)}</span>
                  <span className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <span className="h-full bg-brand-500" style={{ width: `${(d.finalizadas / max) * 100}%` }} />
                    <span className="h-full bg-amber-400" style={{ width: `${(d.abertas / max) * 100}%` }} />
                  </span>
                  <span className="whitespace-nowrap text-xs text-slate-500">
                    {d.finalizadas} fin.{d.abertas ? ` · ${d.abertas} abertos` : ""}
                    {d.sim + d.nao ? ` · ${Math.round((d.sim / (d.sim + d.nao)) * 100)}%` : ""}
                  </span>
                </Link>
              );
            })}
            <p className="pt-1 text-[11px] text-slate-400">Clique num dia para ver só ele. Verde: finalizados; amarelo: em aberto.</p>
          </div>
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
                  <p className="min-w-0 break-words font-medium">{item.texto}</p>
                  <span className="shrink-0 text-slate-500">{item.qtd}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${(item.qtd / maxReprovado) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Itens das UHs por modelo">
        {porModelo.length === 0 ? (
          <Vazio texto="Nenhuma pergunta conferiu item da UH no período. Ligue a pergunta a um item em Gerenciar checklists." />
        ) : (
          <Tabela>
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Modelo cadastrado</th>
                <th className="px-4 py-3 text-right font-medium">Conferidos</th>
                <th className="px-4 py-3 text-right font-medium">Com &quot;Não&quot;</th>
                <th className="px-4 py-3 text-right font-medium">Outro modelo</th>
              </tr>
            </thead>
            <tbody>
              {porModelo.map((m) => (
                <tr key={m.modelo} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{m.modelo}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{m.conferidos}</td>
                  <td className={`px-4 py-3 text-right ${m.nao ? "font-semibold text-red-600" : "text-slate-600"}`}>{m.nao}</td>
                  <td className={`px-4 py-3 text-right ${m.diferentes ? "font-semibold text-amber-700" : "text-slate-600"}`}>
                    {m.diferentes}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
        {divergencias.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="mb-2 font-semibold text-amber-900">Encontraram outro modelo ({divergencias.length})</p>
            <ul className="space-y-1 text-amber-900">
              {divergencias.map((d) => (
                <li key={d.id}>
                  <Link href={`/governanca/inspecao/${d.inspecaoId}`} className="hover:underline">
                    {d.local ? `UH ${d.local} · ` : ""}
                    {d.checklist}: cadastro {d.item_previsto ?? "vazio"} → encontrado {d.item_encontrado ?? "—"}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-amber-800">Corrija o cadastro em Locais, abrindo a UH.</p>
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
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Data</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/governanca/inspecao/${p.inspecao_id}`} className="font-medium text-brand-700 hover:underline">
                      {p.item}
                    </Link>
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-slate-500 md:table-cell">{p.o_que_fazer}</td>
                  <td className="px-4 py-3">
                    <PrioridadeBadge prioridade={p.prioridade} />
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{p.quem_vai_fazer ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{formatDataHora(p.criado_em)}</td>
                  <td className="px-4 py-3">
                    {p.resolvido_em ? (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Resolvido</span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Aberto</span>
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

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-slate-500">{rotulo}</span>
      {children}
    </label>
  );
}

/** Tabela de resumo (colaborador, quem aplicou, checklist): clique no nome filtra por ele. */
function TabelaResumo({
  linhas,
  rotulo,
  link,
}: {
  linhas: LinhaResumo[];
  rotulo: string;
  link: (l: LinhaResumo) => string | null;
}) {
  if (linhas.length === 0) return <Vazio texto="Nenhum checklist no período." />;
  return (
    <Tabela>
      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
        <tr>
          <th className="px-4 py-3 font-medium">{rotulo}</th>
          <th className="px-4 py-3 text-right font-medium">Finalizados</th>
          <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Em aberto</th>
          <th className="px-4 py-3 font-medium">Conformidade</th>
          <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Não</th>
          <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Planos</th>
          <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Tempo médio</th>
          <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Último</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => {
          const href = link(l);
          return (
            <tr key={l.id || l.nome} className="border-t border-slate-100">
              <td className="px-4 py-3">
                {href ? (
                  <Link href={href} className="font-medium text-brand-700 hover:underline">
                    {l.nome}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-500">{l.nome}</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">{l.finalizadas}</td>
              <td className="hidden px-4 py-3 text-right text-slate-500 sm:table-cell">{l.abertas || "—"}</td>
              <td className="px-4 py-3">
                {l.conformidade === null ? (
                  "—"
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:block">
                      <span
                        className={`block h-full rounded-full ${l.conformidade >= 90 ? "bg-brand-500" : l.conformidade >= 70 ? "bg-amber-400" : "bg-red-500"}`}
                        style={{ width: `${l.conformidade}%` }}
                      />
                    </span>
                    <span className="font-semibold">{l.conformidade}%</span>
                  </span>
                )}
              </td>
              <td className={`hidden px-4 py-3 text-right md:table-cell ${l.nao ? "text-red-600" : "text-slate-500"}`}>{l.nao}</td>
              <td className="hidden px-4 py-3 text-right text-slate-500 lg:table-cell">{l.planos}</td>
              <td className="hidden px-4 py-3 text-right text-slate-500 md:table-cell">{formatarDuracao(l.tempoMedio)}</td>
              <td className="hidden px-4 py-3 text-right text-slate-500 lg:table-cell">
                {l.ultima ? formatarDataCurta(l.ultima) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Tabela>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {children}
    </section>
  );
}

function Tabela({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
