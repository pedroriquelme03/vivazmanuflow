import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { agruparPorSecao, formatDataHora, rotuloTipo } from "@/lib/governanca";
import { GovernancaShell } from "../../GovernancaShell";
import { PrioridadeBadge, StatusBadge, Vazio, cardCls } from "../../ui";

export const dynamic = "force-dynamic";

export default async function InspecaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { perfil, papel } = await exigirGovernanca(`/governanca/inspecao/${id}`);

  const supabase = await createClient();
  const [{ data: insp }, { data: respostas }] = await Promise.all([
    supabase
      .from("gov_inspecoes")
      .select(
        "*, gov_acomodacoes(numero, tipo), gov_camareiras(nome), usuarios(nome), gov_processos(nome)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("gov_respostas")
      .select("*, gov_planos_acao(*)")
      .eq("inspecao_id", id),
  ]);

  const lista = respostas ?? [];
  const grupos = agruparPorSecao(lista);
  const totalSim = lista.filter((r) => r.resposta === "sim").length;
  const totalNao = lista.filter((r) => r.resposta === "nao").length;

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <Link href="/governanca" className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Voltar
      </Link>

      {!insp ? (
        <Vazio texto="Inspeção não encontrada." />
      ) : (
        <>
          <div className={`${cardCls} mb-4`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-slate-800">UH {insp.gov_acomodacoes?.numero}</p>
                <p className="text-sm text-slate-500">
                  {rotuloTipo(insp.tipo)} · {insp.gov_processos?.nome}
                </p>
              </div>
              <StatusBadge status={insp.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Info rotulo="Camareira" valor={insp.gov_camareiras?.nome ?? "—"} />
              <Info rotulo="Inspetor" valor={insp.usuarios?.nome ?? "—"} />
              <Info rotulo="Data" valor={formatDataHora(insp.finalizada_em ?? insp.criado_em)} />
              <Info rotulo="Conformidade" valor={`${totalSim} sim · ${totalNao} não`} />
            </dl>
          </div>

          {grupos.map((g) => (
            <section key={`${g.ordem}-${g.nome}`} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {g.nome}
              </h3>
              <div className="space-y-2">
                {g.itens.map((r) => (
                  <div key={r.id} className={cardCls}>
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                          r.resposta === "sim"
                            ? "bg-green-600"
                            : r.resposta === "nao"
                              ? "bg-red-600"
                              : "bg-slate-400"
                        }`}
                      >
                        {r.resposta === "sim" ? "✓" : r.resposta === "nao" ? "✕" : "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{r.pergunta_texto}</p>
                        {r.comentario && <p className="mt-1 text-sm text-slate-500">{r.comentario}</p>}
                        {r.anexo_url && (
                          <a href={r.anexo_url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element -- foto do Storage */}
                            <img
                              src={r.anexo_url}
                              alt="Foto do item"
                              className="mt-2 h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200"
                            />
                          </a>
                        )}
                        {r.gov_planos_acao.map((p) => (
                          <div key={p.id} className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="font-semibold text-red-800">Plano de ação</span>
                              <PrioridadeBadge prioridade={p.prioridade} />
                            </div>
                            <p className="text-slate-700">{p.o_que_fazer}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {p.quem_vai_fazer && <>Responsável: {p.quem_vai_fazer}. </>}
                              {p.quem_pediu && <>Solicitante: {p.quem_pediu}.</>}
                            </p>
                            {p.observacao && <p className="mt-1 text-xs text-slate-500">Obs.: {p.observacao}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </GovernancaShell>
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
