import type { Colaborador } from "@/lib/checklist-setores";
import { avaliadoPronto, type PassoAvaliado } from "@/lib/checklist-avaliado";
import { Vazio, btnPrimario, inputCls, labelCls } from "../ui";

/**
 * Antes das perguntas: o dia a que o checklist se refere e quem é avaliado,
 * conforme o checklist (lista do setor, a própria pessoa ou a pergunta
 * "para mim / para outra pessoa").
 */
export function PassoDados({
  passo,
  eu,
  paraMim,
  onParaMim,
  colaboradores,
  colaborador,
  onColaborador,
  data,
  hoje,
  onData,
  iniciando,
  onContinuar,
}: {
  passo: PassoAvaliado;
  eu: { nome: string };
  paraMim: boolean | null;
  onParaMim: (paraMim: boolean) => void;
  colaboradores: Colaborador[];
  colaborador: Colaborador | null;
  onColaborador: (c: Colaborador) => void;
  data: string;
  hoje: string;
  onData: (data: string) => void;
  iniciando: boolean;
  onContinuar: () => void;
}) {
  const mostraLista = passo === "lista" || (passo === "pergunta" && paraMim === false);
  const pronto = avaliadoPronto(passo, paraMim, Boolean(colaborador), colaboradores.length > 0);

  return (
    <>
      <label className="mb-6 block max-w-xs">
        <span className={labelCls}>Data do checklist</span>
        <input className={inputCls} type="date" value={data} max={hoje} onChange={(e) => onData(e.target.value || hoje)} />
        <span className="mt-1 block text-xs text-slate-500">
          Já vem com hoje. Mude só se estiver lançando um checklist feito em outro dia; o horário de início e de fim
          é gravado sozinho.
        </span>
      </label>

      {passo === "proprio" && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <Inicial nome={eu.nome} />
          <p className="min-w-0 text-sm text-brand-900">
            <b className="block break-words">Para você: {eu.nome}</b>
            Este checklist fica no seu nome, com a sua conta.
          </p>
        </div>
      )}

      {passo === "pergunta" && (
        <>
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Para quem é este checklist?</h2>
          <p className="mb-3 text-sm text-slate-500">Se for para você, ele vai com a sua conta.</p>
          <div className="mb-5 grid grid-cols-2 gap-2">
            {[
              { valor: true, titulo: "Para mim", texto: eu.nome },
              { valor: false, titulo: "Outra pessoa", texto: "Escolher da lista" },
            ].map((o) => (
              <button
                key={o.titulo}
                type="button"
                aria-pressed={paraMim === o.valor}
                onClick={() => onParaMim(o.valor)}
                className={`rounded-xl border p-4 text-left shadow-sm transition ${
                  paraMim === o.valor ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300"
                }`}
              >
                <span className="block font-semibold text-slate-800">{o.titulo}</span>
                <span className="block break-words text-xs text-slate-500">{o.texto}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {mostraLista && (
        <>
          <h2 className="mb-1 text-lg font-semibold text-slate-800">Quem fez o serviço?</h2>
          <p className="mb-3 text-sm text-slate-500">Selecione o colaborador avaliado neste checklist.</p>
          {colaboradores.length === 0 ? (
            <Vazio texto="Nenhum colaborador cadastrado no setor deste checklist." />
          ) : (
            <div className="space-y-2">
              {colaboradores.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onColaborador(c)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition ${
                    colaborador?.id === c.id
                      ? "border-brand-400 bg-brand-50"
                      : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <Inicial nome={c.nome} />
                  <span className="min-w-0 break-words font-medium text-slate-800">{c.nome}</span>
                  {colaborador?.id === c.id && <span className="ml-auto text-brand-600">✓</span>}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onContinuar}
        className={`${btnPrimario} mt-6 w-full`}
        disabled={!pronto || iniciando}
      >
        {iniciando ? "Abrindo…" : "Começar o checklist"}
      </button>
    </>
  );
}

function Inicial({ nome }: { nome: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  );
}
