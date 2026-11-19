import { hojeEmSaoPaulo } from "@/lib/checklist-inspecao";

/**
 * Ocupação do dia vinda do painel operacional (operacionaldash). A recepção
 * cadastra lá toda manhã (normalmente das 8h ao meio-dia); o sistema busca às 13h
 * e confere às 17h. O histórico do painel traz os últimos salvamentos, então cada
 * busca também completa dias que tenham ficado para trás.
 */
export const PAINEL_OPERACIONAL = "https://operacionaldash.vivazcataratas.com.br";
export const URL_HISTORICO_PAINEL = `${PAINEL_OPERACIONAL}/api/dashboard-history?limit=100`;
export const URL_ATUAL_PAINEL = `${PAINEL_OPERACIONAL}/api/dashboard`;

/** Faixas de idade das crianças, como o painel guarda. */
export const FAIXAS_CRIANCAS = ["c02", "c36", "c710", "c1112", "c1317"] as const;
export const ROTULO_FAIXA: Record<(typeof FAIXAS_CRIANCAS)[number], string> = {
  c02: "0 a 2 anos",
  c36: "3 a 6 anos",
  c710: "7 a 10 anos",
  c1112: "11 e 12 anos",
  c1317: "13 a 17 anos",
};

export type OcupacaoDia = {
  data: string;
  adultos: number;
  criancas: number;
  criancas_faixas: Record<string, number>;
  uhs_ocupadas: number | null;
  taxa_ocupacao: number | null;
  atualizado_no_painel: string;
};

function inteiro(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function numeroOuNulo(v: unknown) {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
}

/**
 * Um salvamento do painel vira a ocupação do dia em que foi salvo (horário de
 * Brasília). Sem hóspedes nenhum, não serve: o painel estava vazio.
 */
export function ocupacaoDoPainel(payload: unknown, salvoEm?: string | null): OcupacaoDia | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const quando = String(p.lastUpdatedAt || salvoEm || "");
  const instante = new Date(quando);
  if (!quando || Number.isNaN(instante.getTime())) return null;

  const g = (p.guests && typeof p.guests === "object" ? p.guests : {}) as Record<string, unknown>;
  const faixas = Object.fromEntries(FAIXAS_CRIANCAS.map((f) => [f, inteiro(g[f])]));
  const adultos = inteiro(g.adults);
  const criancas = Object.values(faixas).reduce((s, n) => s + n, 0);
  if (adultos + criancas === 0) return null;

  const o = (p.occupancy && typeof p.occupancy === "object" ? p.occupancy : {}) as Record<string, unknown>;
  return {
    data: hojeEmSaoPaulo(instante),
    adultos,
    criancas,
    criancas_faixas: faixas,
    uhs_ocupadas: numeroOuNulo(o.occupied),
    taxa_ocupacao: numeroOuNulo(o.rate),
    atualizado_no_painel: instante.toISOString(),
  };
}

/** Do histórico do painel, o último salvamento de cada dia. */
export function ultimaPorDia(
  entradas: { saved_at?: string | null; payload?: unknown }[],
): OcupacaoDia[] {
  const porDia = new Map<string, OcupacaoDia>();
  for (const e of entradas) {
    const o = ocupacaoDoPainel(e.payload, e.saved_at);
    if (!o) continue;
    const atual = porDia.get(o.data);
    if (!atual || o.atualizado_no_painel > atual.atualizado_no_painel) porDia.set(o.data, o);
  }
  return [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data));
}
