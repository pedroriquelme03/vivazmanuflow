export type UnidadePreventiva = "dia" | "mes" | "ano";

export const RITMOS_PREVENTIVA = [
  { id: "semana", rotulo: "Toda semana", quantidade: 7, unidade: "dia" },
  { id: "mes", rotulo: "Todo mês", quantidade: 1, unidade: "mes" },
  { id: "bimestre", rotulo: "Mês sim, mês não", quantidade: 2, unidade: "mes" },
  { id: "trimestre", rotulo: "A cada 3 meses", quantidade: 3, unidade: "mes" },
  { id: "semestre", rotulo: "A cada 6 meses", quantidade: 6, unidade: "mes" },
  { id: "ano", rotulo: "Uma vez por ano", quantidade: 1, unidade: "ano" },
] as const satisfies readonly {
  id: string;
  rotulo: string;
  quantidade: number;
  unidade: UnidadePreventiva;
}[];

export function rotuloUnidade(qtd: number, unidade: UnidadePreventiva) {
  if (unidade === "dia") return qtd === 1 ? "dia" : "dias";
  if (unidade === "ano") return qtd === 1 ? "ano" : "anos";
  return qtd === 1 ? "mês" : "meses";
}

export function rotuloRitmo(qtd: number, unidade: UnidadePreventiva) {
  const pronto = RITMOS_PREVENTIVA.find(
    (r) => r.quantidade === qtd && r.unidade === unidade,
  );
  if (pronto) return pronto.rotulo;
  return `A cada ${qtd} ${rotuloUnidade(qtd, unidade)}`;
}

export function tituloChamadoPreventiva(titulo: string) {
  const limpo = titulo.trim();
  if (limpo.toLowerCase().startsWith("preventiva:")) return limpo;
  return `Preventiva: ${limpo}`;
}

function partesData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

function isoDe(y: number, m: number, d: number) {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function ultimoDia(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Soma o intervalo sem estourar o dia (31 de janeiro + 1 mês = 28 de fevereiro). */
export function somarIntervalo(
  iso: string,
  quantidade: number,
  unidade: UnidadePreventiva,
) {
  const { y, m, d } = partesData(iso);
  const qtd = Math.max(1, quantidade);
  if (unidade === "dia") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + qtd);
    return isoDe(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const total = unidade === "ano" ? y * 12 + (m - 1) + qtd * 12 : y * 12 + (m - 1) + qtd;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return isoDe(ny, nm, Math.min(d, ultimoDia(ny, nm)));
}

/** Próxima data estritamente depois de hoje, pulando as que já passaram. */
export function proximaAberturaApos(
  iso: string,
  quantidade: number,
  unidade: UnidadePreventiva,
  hoje: string,
) {
  let cursor = iso.slice(0, 10);
  let guard = 0;
  while (cursor <= hoje.slice(0, 10) && guard < 400) {
    const next = somarIntervalo(cursor, quantidade, unidade);
    if (next <= cursor) break;
    cursor = next;
    guard += 1;
  }
  return cursor;
}
