import { somarIntervalo, type UnidadePreventiva } from "@/lib/preventiva";

/**
 * Cronograma anual "Previsto x Feito" das preventivas, no formato da planilha
 * da Leankeep: cada rotina vira uma linha e cada mês mostra o que estava
 * previsto e o que foi feito.
 */

export type RotinaCronograma = {
  id: string;
  titulo: string;
  local: string;
  intervalo_quantidade: number;
  intervalo_unidade: string;
  proxima_abertura: string;
  criado_em: string;
  ativo: boolean;
};

export type ChamadoPreventiva = {
  preventiva_id: string | null;
  criado_em: string;
  concluido_em: string | null;
  status: string;
};

export type EstadoPrevisto =
  | "no_prazo"
  | "atrasada"
  | "em_aberto"
  | "cancelada"
  | "sem_registro"
  | "futura";

export type Ocorrencia = { data: string; estado: EstadoPrevisto; feitoEm: string | null };

export type LinhaCronograma = {
  rotina: RotinaCronograma;
  meses: Ocorrencia[][];
};

export type ResumoMes = {
  mes: number;
  previstas: number;
  executadas: number;
  noPrazo: number;
  percentual: number | null;
};

export type ResumoCronograma = {
  linhas: LinhaCronograma[];
  meses: ResumoMes[];
  previstasAteHoje: number;
  executadas: number;
  noPrazo: number;
  pendentesAtrasadas: number;
  canceladas: number;
  execucao: number | null;
  execucaoNoPrazo: number | null;
};

function unidade(valor: string): UnidadePreventiva {
  return valor === "dia" || valor === "ano" ? valor : "mes";
}

/** Recua um intervalo (o inverso de somarIntervalo). */
export function subtrairIntervalo(iso: string, quantidade: number, un: UnidadePreventiva) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const qtd = Math.max(1, quantidade);
  if (un === "dia") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - qtd);
    return dt.toISOString().slice(0, 10);
  }
  const total = y * 12 + (m - 1) - (un === "ano" ? qtd * 12 : qtd);
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

/** Datas previstas da rotina dentro do ano, a partir da próxima abertura. */
export function datasPrevistas(rotina: RotinaCronograma, ano: number) {
  const qtd = rotina.intervalo_quantidade;
  const un = unidade(rotina.intervalo_unidade);
  const inicioAno = `${ano}-01-01`;
  const fimAno = `${ano}-12-31`;
  const criada = rotina.criado_em.slice(0, 10);

  let cursor = rotina.proxima_abertura.slice(0, 10);
  let guard = 0;
  while (cursor >= inicioAno && guard < 800) {
    const anterior = subtrairIntervalo(cursor, qtd, un);
    if (anterior < criada.slice(0, 7) + "-01") break;
    cursor = anterior;
    guard += 1;
  }

  const datas: string[] = [];
  guard = 0;
  while (cursor <= fimAno && guard < 800) {
    if (cursor >= inicioAno && cursor.slice(0, 7) >= criada.slice(0, 7)) datas.push(cursor);
    cursor = somarIntervalo(cursor, qtd, un);
    guard += 1;
  }
  return datas;
}

function percentual(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : null;
}

export function montarCronograma(
  rotinas: RotinaCronograma[],
  chamados: ChamadoPreventiva[],
  ano: number,
  hoje: string,
): ResumoCronograma {
  const porRotina = new Map<string, ChamadoPreventiva[]>();
  for (const c of chamados) {
    if (!c.preventiva_id) continue;
    const lista = porRotina.get(c.preventiva_id) ?? [];
    lista.push(c);
    porRotina.set(c.preventiva_id, lista);
  }

  const meses: ResumoMes[] = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    previstas: 0,
    executadas: 0,
    noPrazo: 0,
    percentual: null,
  }));
  let previstasAteHoje = 0;
  let executadas = 0;
  let noPrazo = 0;
  let pendentesAtrasadas = 0;
  let canceladas = 0;

  const linhas: LinhaCronograma[] = [];
  for (const rotina of rotinas) {
    const datas = datasPrevistas(rotina, ano);
    const proxima = (i: number) =>
      datas[i + 1] ??
      somarIntervalo(datas[i], rotina.intervalo_quantidade, unidade(rotina.intervalo_unidade));
    const lista = [...(porRotina.get(rotina.id) ?? [])].sort((a, b) =>
      a.criado_em.localeCompare(b.criado_em),
    );

    const linha: LinhaCronograma = { rotina, meses: Array.from({ length: 12 }, () => []) };
    datas.forEach((data, i) => {
      const limite = proxima(i);
      // O chamado é aberto no dia previsto (ou no primeiro acesso depois dele).
      const chamado = lista.find((c) => {
        const dia = c.criado_em.slice(0, 10);
        return dia >= data && dia < limite;
      });

      let estado: EstadoPrevisto;
      let feitoEm: string | null = null;
      if (chamado?.status === "cancelada") estado = "cancelada";
      else if (chamado?.concluido_em) {
        feitoEm = chamado.concluido_em.slice(0, 10);
        estado = feitoEm < limite ? "no_prazo" : "atrasada";
      } else if (chamado) estado = "em_aberto";
      else estado = data > hoje ? "futura" : "sem_registro";

      const mes = Number(data.slice(5, 7)) - 1;
      linha.meses[mes].push({ data, estado, feitoEm });

      const resumo = meses[mes];
      resumo.previstas += 1;
      if (feitoEm) resumo.executadas += 1;
      if (estado === "no_prazo") resumo.noPrazo += 1;

      if (data <= hoje) {
        previstasAteHoje += 1;
        if (feitoEm) executadas += 1;
        if (estado === "no_prazo") noPrazo += 1;
        if (estado === "cancelada") canceladas += 1;
        if ((estado === "em_aberto" || estado === "sem_registro") && limite <= hoje) {
          pendentesAtrasadas += 1;
        }
      }
    });
    linhas.push(linha);
  }

  for (const m of meses) m.percentual = percentual(m.executadas, m.previstas);

  return {
    linhas,
    meses,
    previstasAteHoje,
    executadas,
    noPrazo,
    pendentesAtrasadas,
    canceladas,
    execucao: percentual(executadas, previstasAteHoje),
    execucaoNoPrazo: percentual(noPrazo, previstasAteHoje),
  };
}

export const ESTADO_PREVISTO: Record<EstadoPrevisto, { rotulo: string; cor: string }> = {
  no_prazo: { rotulo: "Feita no prazo", cor: "bg-emerald-500 text-white" },
  atrasada: { rotulo: "Feita com atraso", cor: "bg-amber-400 text-amber-950" },
  em_aberto: { rotulo: "Chamado em aberto", cor: "bg-sky-500 text-white" },
  cancelada: { rotulo: "Cancelada", cor: "bg-slate-400 text-white" },
  sem_registro: { rotulo: "Sem registro", cor: "bg-red-500 text-white" },
  futura: { rotulo: "Prevista", cor: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300" },
};
