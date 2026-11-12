import {
  setoresPorPropriedade,
  type PropriedadeRef,
  type SetorChecklist,
} from "@/lib/checklist-setores";
import { propriedadesAtivas } from "@/lib/propriedade-opcoes";
import { inputCls } from "./ui";

/** Escolha de setor agrupada por propriedade. `vazio` adiciona a opção em branco. */
export function SelectSetor({
  value,
  onChange,
  setores,
  propriedades,
  vazio,
}: {
  value: string;
  onChange: (setorId: string) => void;
  setores: readonly SetorChecklist[];
  propriedades: readonly PropriedadeRef[];
  vazio?: string;
}) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {vazio !== undefined && <option value="">{vazio}</option>}
      {setoresPorPropriedade(setores, propriedades).map((g) => (
        <optgroup key={g.propriedade.id} label={g.propriedade.nome}>
          {g.setores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
              {s.ativo ? "" : " (inativo)"}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * Escolha de propriedade. Para cadastrar, só as ativas; com `vazio` (filtro),
 * todas, para achar também o que ficou em propriedade desativada.
 */
export function SelectPropriedade({
  value,
  onChange,
  propriedades,
  vazio,
}: {
  value: string;
  onChange: (propriedadeId: string) => void;
  propriedades: PropriedadeRef[];
  vazio?: string;
}) {
  const opcoes = vazio === undefined ? propriedadesAtivas(propriedades, value) : propriedades;
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {vazio !== undefined && <option value="">{vazio}</option>}
      {opcoes.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nome}
        </option>
      ))}
    </select>
  );
}
