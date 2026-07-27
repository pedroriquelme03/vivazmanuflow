import {
  PRIORIDADE_BADGE,
  PRIORIDADE_LABEL,
} from "@/lib/demanda-ui";
import type { Enums } from "@/lib/database.types";

type Prioridade = Enums<"demanda_prioridade">;

/** Tag de prioridade que acompanha o card da demanda em todo o fluxo. */
export function PrioridadeTag({
  prioridade,
  className = "",
}: {
  prioridade: Prioridade;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${PRIORIDADE_BADGE[prioridade]} ${className}`}
    >
      {PRIORIDADE_LABEL[prioridade]}
    </span>
  );
}
