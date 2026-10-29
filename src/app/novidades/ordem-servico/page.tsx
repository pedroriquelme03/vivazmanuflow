import { createClient } from "@/lib/supabase/server";
import { PRIORIDADE_LABEL, STATUS_LABEL } from "@/lib/demanda-ui";
import { SITUACAO_OS, dataBr, dataHoraBr, numeroOs } from "@/lib/novidades/formato";
import { Titulo, cardCls } from "../../governanca/ui";
import { exigirNovidades } from "../acesso";
import { CHAMADO_COMPLETO, chamadosRecentes, type ChamadoCompleto } from "../chamados";
import { BotaoImprimir, SeletorChamado } from "../Comuns";
import { NovidadesShell } from "../NovidadesShell";

export const dynamic = "force-dynamic";

export default async function OrdemServicoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const perfil = await exigirNovidades("/novidades/ordem-servico");
  const { id } = await searchParams;
  const chamados = await chamadosRecentes();

  let chamado: ChamadoCompleto | null = null;
  if (id && id !== "branco") {
    const supabase = await createClient();
    const { data } = await supabase.from("demandas").select(CHAMADO_COMPLETO).eq("id", id).maybeSingle();
    chamado = data as unknown as ChamadoCompleto | null;
  }

  return (
    <NovidadesShell perfil={perfil}>
      <div className="print:hidden">
        <Titulo
          titulo="Ordem de serviço"
          subtitulo="Escolha um chamado para gerar a OS no modelo da Leankeep, ou imprima uma em branco. Pedido, constatação, ação e pendência ficam em campos separados."
        />
        <SeletorChamado chamados={chamados} atual={id ?? null} />
      </div>

      {(chamado || id === "branco") && (
        <>
          <div className="mt-5 flex justify-end print:hidden">
            <BotaoImprimir />
          </div>
          <FolhaOs c={chamado} />
          {chamado && <Conferencia c={chamado} />}
        </>
      )}
    </NovidadesShell>
  );
}

function Campo({
  n,
  titulo,
  children,
  linhas = 0,
}: {
  n: number;
  titulo: string;
  children?: React.ReactNode;
  linhas?: number;
}) {
  return (
    <div className="break-inside-avoid border-t border-slate-300 px-4 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {n}. {titulo}
      </p>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="mt-5 border-b border-dotted border-slate-400" />
      ))}
    </div>
  );
}

function FolhaOs({ c }: { c: ChamadoCompleto | null }) {
  const local = [c?.local?.nome, c?.sublocal].filter(Boolean).join(" · ");
  const tipo = c ? (c.preventiva_id ? "Preventiva" : "Corretiva") : "";
  const registros = (c?.historico ?? [])
    .filter((h) => h.observacao)
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  const fotos = (c?.anexos ?? []).filter((a) => a.tipo === "foto");
  const videos = (c?.anexos ?? []).filter((a) => a.tipo === "video");
  const pendencia = c?.motivo_nao_conclusao || c?.mensagem_devolucao;

  return (
    <article className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm print:rounded-none print:shadow-none">
      <header className="flex items-start justify-between gap-4 bg-[#063b45] px-4 py-3 text-white print:bg-white print:text-black">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-70">Vivaz Cataratas · Manutenção</p>
          <h2 className="text-lg font-bold">Ordem de serviço {tipo && `· ${tipo}`}</h2>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-bold">{c ? numeroOs(c.id) : "OS-________"}</p>
          <p className="text-xs opacity-70">Emitida em {dataHoraBr(new Date().toISOString())}</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 print:grid-cols-2">
        <Campo n={1} titulo="Número da OS">
          {c ? numeroOs(c.id) : ""}
        </Campo>
        <Campo n={2} titulo="Cliente, contrato e unidade" linhas={c ? 0 : 1}>
          {c?.propriedade?.nome}
        </Campo>
        <Campo n={3} titulo="Local e ativo" linhas={local ? 0 : 1}>
          {local}
        </Campo>
        <Campo n={4} titulo="Origem e data do pedido" linhas={c ? 0 : 1}>
          {c && (
            <>
              {c.preventiva_id ? "Plano preventivo" : `Solicitante: ${c.solicitante?.nome ?? "—"}`} ·{" "}
              {dataHoraBr(c.criado_em)}
            </>
          )}
        </Campo>
      </div>
      <Campo n={5} titulo="Serviço solicitado" linhas={c ? 0 : 2}>
        {c && (
          <>
            <p className="font-semibold">{c.titulo}</p>
            {c.descricao && <p className="whitespace-pre-line text-slate-700">{c.descricao}</p>}
          </>
        )}
      </Campo>
      <div className="grid sm:grid-cols-2 print:grid-cols-2">
        <Campo n={6} titulo="Prioridade e prazo" linhas={c ? 0 : 1}>
          {c && (
            <>
              {PRIORIDADE_LABEL[c.prioridade]}
              {(c.prazo_confirmado || c.prazo_sugerido) &&
                ` · prazo ${dataBr(c.prazo_confirmado ?? c.prazo_sugerido)}`}
            </>
          )}
        </Campo>
        <Campo n={7} titulo="Responsável pela execução" linhas={c?.colaborador ? 0 : 1}>
          {c?.colaborador?.nome}
        </Campo>
      </div>
      <Campo n={8} titulo="Procedimento ou checklist" linhas={c?.preventiva ? 0 : 1}>
        {c?.preventiva && (
          <>
            <p>{c.preventiva.titulo}</p>
            {c.preventiva.descricao && (
              <p className="whitespace-pre-line text-xs text-slate-600">{c.preventiva.descricao}</p>
            )}
          </>
        )}
      </Campo>
      <div className="grid sm:grid-cols-2 print:grid-cols-2">
        <Campo n={9} titulo="Início" linhas={c?.iniciado_em ? 0 : 1}>
          {dataHoraBr(c?.iniciado_em)}
        </Campo>
        <Campo n={9} titulo="Término" linhas={c?.concluido_em ? 0 : 1}>
          {dataHoraBr(c?.concluido_em)}
        </Campo>
      </div>
      <Campo n={10} titulo="Constatação (situação encontrada)" linhas={2} />
      <Campo n={10} titulo="Ação executada" linhas={registros.length ? 1 : 2}>
        {registros.length > 0 && (
          <ul className="space-y-1">
            {registros.map((h, i) => (
              <li key={i} className="text-sm">
                <span className="text-xs text-slate-500">
                  {dataHoraBr(h.criado_em)} · {h.usuario?.nome ?? "Sistema"} ·{" "}
                  {STATUS_LABEL[h.status_novo as keyof typeof STATUS_LABEL] ?? h.status_novo}:
                </span>{" "}
                {h.observacao}
              </li>
            ))}
          </ul>
        )}
      </Campo>
      <Campo n={11} titulo="Materiais e serviços">
        <table className="mt-1 w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="w-1/2 font-medium">Item</th>
              <th className="font-medium">Qtd.</th>
              <th className="font-medium">Unid.</th>
              <th className="font-medium">Custo</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: 4 }, (_, j) => (
                  <td key={j} className="h-7 border-b border-dotted border-slate-400" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Campo>
      <Campo n={12} titulo="Evidências (fotos, medições, anexos)" linhas={1}>
        {fotos.length + videos.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {fotos.slice(0, 8).map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={a.url} src={a.url} alt="Evidência" className="h-20 w-20 rounded border object-cover" />
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {fotos.length} foto(s){videos.length ? ` e ${videos.length} vídeo(s)` : ""} vinculados ao chamado.
            </p>
          </>
        )}
        <p className="mt-2 text-xs text-slate-500">Medições: grandeza, valor, unidade e condição de coleta.</p>
      </Campo>
      <Campo n={13} titulo="Pendências e próximo passo (motivo, responsável, previsão)" linhas={pendencia ? 1 : 2}>
        {pendencia}
      </Campo>
      <Campo n={14} titulo="Encerramento e recebimento">
        {c && <p>Situação: <b>{SITUACAO_OS[c.status]}</b></p>}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center text-xs text-slate-500">
          {["Executor", "Conferência", "Recebimento / aceite"].map((r) => (
            <div key={r}>
              <div className="mb-1 h-8 border-b border-slate-500" />
              {r} · data
            </div>
          ))}
        </div>
      </Campo>
    </article>
  );
}

function Conferencia({ c }: { c: ChamadoCompleto }) {
  const pendencia = Boolean(c.motivo_nao_conclusao || c.mensagem_devolucao);
  const itens: [string, boolean | null][] = [
    ["Cliente, local e ativo estão identificados?", Boolean(c.local?.nome || c.sublocal)],
    ["Pedido, constatação e ação estão separados?", null],
    ["Datas e responsável estão preenchidos?", Boolean(c.colaborador && c.iniciado_em)],
    ["As evidências estão vinculadas ao atendimento?", c.anexos.length > 0],
    ["Cada pendência tem responsável e próximo passo?", pendencia ? null : true],
    ["O status reflete a situação real, inclusive o recebimento?", c.status === "concluida" ? true : null],
  ];
  return (
    <section className={`${cardCls} mt-5 print:hidden`}>
      <h2 className="font-bold text-slate-800">Conferência antes de fechar</h2>
      <p className="text-xs text-slate-500">Checklist da Leankeep. O que dá para checar sozinho já vem marcado.</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {itens.map(([texto, ok]) => (
          <li key={texto} className="flex items-start gap-2">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                ok === true ? "bg-emerald-500" : ok === false ? "bg-red-500" : "bg-slate-300"
              }`}
            >
              {ok === true ? "✓" : ok === false ? "!" : "?"}
            </span>
            {texto}
          </li>
        ))}
      </ul>
    </section>
  );
}
