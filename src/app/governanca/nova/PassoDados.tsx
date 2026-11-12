import type { Colaborador } from "@/lib/checklist-setores";
import { Vazio, btnPrimario, inputCls, labelCls } from "../ui";

/**
 * Antes das perguntas: o dia a que o checklist se refere e, para líder e admin,
 * quem é avaliado (só o pessoal do setor do checklist).
 */
export function PassoDados({
  escolheColaborador,
  colaboradores,
  colaborador,
  onColaborador,
  data,
  hoje,
  onData,
  onContinuar,
}: {
  escolheColaborador: boolean;
  colaboradores: Colaborador[];
  colaborador: Colaborador | null;
  onColaborador: (c: Colaborador) => void;
  data: string;
  hoje: string;
  onData: (data: string) => void;
  onContinuar: () => void;
}) {
  const faltaColaborador = escolheColaborador && colaboradores.length > 0 && !colaborador;

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

      {escolheColaborador && (
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
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                    {c.nome.charAt(0)}
                  </span>
                  <span className="font-medium text-slate-800">{c.nome}</span>
                  {colaborador?.id === c.id && <span className="ml-auto text-brand-600">✓</span>}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <button type="button" onClick={onContinuar} className={`${btnPrimario} mt-6 w-full`} disabled={faltaColaborador}>
        Começar o checklist
      </button>
    </>
  );
}
