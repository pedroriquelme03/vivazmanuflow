import type { TipoProcesso } from "@/lib/governanca";
import { inputCls, labelCls } from "../../ui";

const OPCOES: { valor: TipoProcesso; rotulo: string }[] = [
  { valor: "ambos", rotulo: "UHs (suítes e apartamentos)" },
  { valor: "apartamento", rotulo: "Só apartamentos" },
  { valor: "suite", rotulo: "Só suítes" },
  { valor: "area", rotulo: "Áreas (casa de máquinas, bilheteria…)" },
];

/** Se o checklist pede um local antes de começar e qual tipo de local. */
export function CampoLocal({
  usaLocal,
  onUsaLocal,
  tipo,
  onTipo,
}: {
  usaLocal: boolean;
  onUsaLocal: (valor: boolean) => void;
  tipo: TipoProcesso;
  onTipo: (valor: TipoProcesso) => void;
}) {
  return (
    <>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={usaLocal} onChange={(e) => onUsaLocal(e.target.checked)} />
        Pede o local (UH ou área) antes de começar
      </label>
      {usaLocal && (
        <label className="block">
          <span className={labelCls}>Local</span>
          <select className={inputCls} value={tipo} onChange={(e) => onTipo(e.target.value as TipoProcesso)}>
            {OPCOES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
