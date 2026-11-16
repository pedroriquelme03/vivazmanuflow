import type { TipoProcesso } from "@/lib/governanca";
import { inputCls, labelCls } from "../../ui";

const OPCOES: { valor: TipoProcesso; rotulo: string }[] = [
  { valor: "ambos", rotulo: "UHs (suítes e apartamentos)" },
  { valor: "apartamento", rotulo: "Só apartamentos" },
  { valor: "suite", rotulo: "Só suítes" },
  { valor: "area", rotulo: "Outros locais (casa de máquinas, bilheteria…)" },
];

/**
 * Se o checklist pede o local específico antes de começar. Ligado à árvore ("Onde se
 * aplica"), os locais oferecidos saem de lá; sem ligação, vale o tipo de local antigo.
 */
export function CampoLocal({
  usaLocal,
  onUsaLocal,
  tipo,
  onTipo,
  temLigacoes = false,
}: {
  usaLocal: boolean;
  onUsaLocal: (valor: boolean) => void;
  tipo: TipoProcesso;
  onTipo: (valor: TipoProcesso) => void;
  temLigacoes?: boolean;
}) {
  return (
    <>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-0.5" checked={usaLocal} onChange={(e) => onUsaLocal(e.target.checked)} />
        <span>
          Pede o local na hora de preencher (ex.: a UH, a casa de máquinas)
          {temLigacoes && (
            <span className="block text-xs text-slate-500">Os locais oferecidos são os de “Onde se aplica”.</span>
          )}
        </span>
      </label>
      {usaLocal && !temLigacoes && (
        <label className="block">
          <span className={labelCls}>Que locais aparecem</span>
          <select className={inputCls} value={tipo} onChange={(e) => onTipo(e.target.value as TipoProcesso)}>
            {OPCOES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">Ou ligue o checklist à árvore em “Onde se aplica”.</span>
        </label>
      )}
    </>
  );
}
