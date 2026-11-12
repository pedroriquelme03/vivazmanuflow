import type { ReactNode } from "react";
import { SEM_SETOR, chaveGrupo, type GrupoPropriedade } from "@/lib/checklist-setores";

/** Lista agrupada: propriedade (título) → setor (subtítulo) → itens. */
export function GruposPorSetor<T>({
  grupos,
  renderItem,
}: {
  grupos: GrupoPropriedade<T>[];
  /** Cada item precisa vir com `key`. */
  renderItem: (item: T) => ReactNode;
}) {
  return grupos.map((g) => (
    <section key={chaveGrupo(g.propriedade)} className="mb-6">
      <h2 className="mb-3 text-sm font-bold text-slate-700">{g.propriedade?.nome ?? SEM_SETOR}</h2>
      {g.setores.map((s) => (
        <div key={chaveGrupo(s.setor)} className="mb-4">
          {s.setor && (
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {s.setor.nome} · {s.itens.length}
            </h3>
          )}
          <div className="space-y-2">{s.itens.map(renderItem)}</div>
        </div>
      ))}
    </section>
  ));
}
