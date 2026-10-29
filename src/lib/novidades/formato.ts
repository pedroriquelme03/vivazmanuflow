import type { Enums } from "@/lib/database.types";

export function numeroOs(id: string) {
  return `OS-${id.slice(0, 8).toUpperCase()}`;
}

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function dataHoraBr(iso: string | null | undefined) {
  return iso ? fmtDataHora.format(new Date(iso)) : "";
}

export function dataBr(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Status do chamado na linguagem de OS da Leankeep. */
export const SITUACAO_OS: Record<Enums<"demanda_status">, string> = {
  aberta: "Aguardando execução",
  atribuida: "Aguardando execução (responsável definido)",
  em_andamento: "Trabalho em andamento",
  aguardando_validacao: "Executado, aguardando conferência",
  concluida: "Encerrado",
  cancelada: "Cancelado",
};

export const ABERTOS: Enums<"demanda_status">[] = [
  "aberta",
  "atribuida",
  "em_andamento",
  "aguardando_validacao",
];
