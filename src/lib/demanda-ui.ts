import type { Enums } from "@/lib/database.types";

type Status = Enums<"demanda_status">;
type Prioridade = Enums<"demanda_prioridade">;

export const STATUS_LABEL: Record<Status, string> = {
  aberta: "Aberta",
  atribuida: "Atribuída",
  em_andamento: "Em andamento",
  aguardando_validacao: "Aguardando validação",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/** Classes Tailwind (fundo + texto) para o badge de cada status. */
export const STATUS_BADGE: Record<Status, string> = {
  aberta: "bg-slate-100 text-slate-700",
  atribuida: "bg-blue-100 text-blue-700",
  em_andamento: "bg-amber-100 text-amber-800",
  aguardando_validacao: "bg-sky-100 text-sky-800",
  concluida: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-red-100 text-red-700",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const PRIORIDADE_DOT: Record<Prioridade, string> = {
  alta: "bg-red-500",
  media: "bg-orange-500",
  baixa: "bg-emerald-500",
};

/** Badge colorido da prioridade (alta vermelha, média laranja, baixa verde). */
export const PRIORIDADE_BADGE: Record<Prioridade, string> = {
  alta: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20",
  media: "bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-600/20",
  baixa: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
};

const FMT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : FMT.format(d);
}

/** Texto livre do form; se vazio, usa o cadastro antigo de sublocal. */
export function nomeSublocal(
  sublocal?: string | null,
  cadastro?: string | null,
) {
  const t = sublocal?.trim();
  if (t) return t;
  return cadastro?.trim() || "";
}

function formatarDuracao(ms: number): string {
  const min = Math.floor(ms / 60000);
  const dias = Math.floor(min / 1440);
  const horas = Math.floor((min % 1440) / 60);
  const mins = min % 60;
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${mins}m`;
  return `${mins}m`;
}

export type NivelPrazo = "ok" | "atencao" | "estourado" | "nenhum";

export const PRAZO_COR: Record<NivelPrazo, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  atencao: "bg-amber-100 text-amber-800",
  estourado: "bg-red-100 text-red-700",
  nenhum: "bg-slate-100 text-slate-500",
};

/**
 * Cronômetro visual: verde até 70% do prazo, amarelo a partir daí, vermelho
 * quando estoura. Usa `atribuido_em` como início da contagem.
 */
export function calcularUrgencia(
  prazo: string | null,
  atribuidoEm: string | null,
  agora: number = Date.now(),
): { nivel: NivelPrazo; label: string } {
  if (!prazo) return { nivel: "nenhum", label: "Sem prazo" };
  const fim = new Date(prazo).getTime();
  const restante = fim - agora;
  if (restante <= 0)
    return { nivel: "estourado", label: `Atrasada ${formatarDuracao(-restante)}` };

  const inicio = atribuidoEm ? new Date(atribuidoEm).getTime() : agora;
  const total = fim - inicio;
  const decorrido = total > 0 ? (agora - inicio) / total : 0;
  const nivel: NivelPrazo = decorrido >= 0.7 ? "atencao" : "ok";
  return { nivel, label: `Faltam ${formatarDuracao(restante)}` };
}

export const MOTIVO_NAO_PERTURBE = "Não perturbe";

export function ehMotivoNaoPerturbe(motivo: string | null | undefined): boolean {
  return (motivo ?? "").trim().toLocaleLowerCase("pt-BR") === "não perturbe";
}

export function urlFotoNaoPerturbe(
  motivo: string | null | undefined,
  anexos:
    | { url: string; tipo: string; enviado_por: string; criado_em?: string }[]
    | null
    | undefined,
): string | null {
  if (!ehMotivoNaoPerturbe(motivo) || !anexos?.length) return null;
  const fotos = anexos
    .filter((a) => a.tipo === "foto" && a.enviado_por === "colaborador")
    .sort((a, b) => (a.criado_em ?? "").localeCompare(b.criado_em ?? ""));
  return fotos.at(-1)?.url ?? null;
}

export function urlFotoColaboradorMaisRecente(
  anexos:
    | { url: string; tipo: string; enviado_por: string; criado_em?: string }[]
    | null
    | undefined,
): string | null {
  if (!anexos?.length) return null;
  const fotos = anexos
    .filter((a) => a.tipo === "foto" && a.enviado_por === "colaborador")
    .sort((a, b) => (a.criado_em ?? "").localeCompare(b.criado_em ?? ""));
  return fotos.at(-1)?.url ?? null;
}

export function mensagemDevolucaoGestor(
  historico:
    | {
        observacao: string | null;
        status_anterior: string | null;
        status_novo: string;
        criado_em?: string;
      }[]
    | null
    | undefined,
): string | null {
  const itens = (historico ?? [])
    .filter(
      (h) =>
        h.status_anterior === "aguardando_validacao" &&
        h.status_novo === "em_andamento" &&
        (h.observacao ?? "").trim(),
    )
    .sort((a, b) => (a.criado_em ?? "").localeCompare(b.criado_em ?? ""));
  const texto = itens.at(-1)?.observacao?.trim();
  if (!texto) return null;
  return texto.replace(/^Devolução do gestor:\s*/i, "");
}
