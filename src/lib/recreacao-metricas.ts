/**
 * Métricas da Recreação, a partir dos registros de atividade do checklist e da
 * ocupação do dia (painel operacional). Mesmas contas do dashboard da planilha,
 * com dois ajustes:
 *   - Familiar passa a ter base (adultos + crianças); na planilha ficava "-".
 *   - Turno (manhã/tarde/noite) e dia da semana entram como filtro e gráfico.
 */

export const CODIGO_REGISTRO_RECREACAO = "vivaz-recreacao-registro";
export const PUBLICOS = ["Infantil", "Adulto", "Familiar"] as const;
export const TURNOS = [
  { valor: "manha", rotulo: "Manhã", de: 0, ate: 12 },
  { valor: "tarde", rotulo: "Tarde", de: 12, ate: 18 },
  { valor: "noite", rotulo: "Noite", de: 18, ate: 24 },
] as const;
export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type RegistroAtividade = {
  id: string;
  data: string; // AAAA-MM-DD
  hora: string | null; // HH:MM
  atividade: string;
  publico: string | null;
  participantes: number;
  responsavelId: string | null;
  responsavel: string;
  observacoes: string | null;
};

export type Ocupacao = { adultos: number; criancas: number };

export type FiltrosRecreacao = {
  de: string;
  ate: string;
  atividade: string;
  responsavel: string;
  publico: string;
  turno: string;
};

/** Resposta de cada item do registro, achada pela chave fixa do item (ou pelo texto, se não tiver chave). */
const TEXTO_DA_CHAVE: Record<string, RegExp> = {
  atividade: /^atividade/i,
  hora: /^hora/i,
  publico: /^p[úu]blico/i,
  participantes: /participantes/i,
  observacoes: /^observa/i,
};

export type RespostaRegistro = { chave: string | null; texto: string; valor: string | null };

export function lerRegistro(respostas: RespostaRegistro[]) {
  const achar = (chave: string) =>
    respostas.find((r) => r.chave === chave)?.valor ??
    respostas.find((r) => !r.chave && TEXTO_DA_CHAVE[chave].test(r.texto.trim()))?.valor ??
    null;
  const n = Number(achar("participantes"));
  return {
    atividade: achar("atividade")?.trim() || "Sem atividade",
    hora: achar("hora")?.slice(0, 5) || null,
    publico: achar("publico")?.trim() || null,
    participantes: Number.isFinite(n) && n > 0 ? Math.round(n) : 0,
    observacoes: achar("observacoes")?.trim() || null,
  };
}

export function turnoDaHora(hora: string | null) {
  if (!hora) return null;
  const h = Number(hora.slice(0, 2));
  if (!Number.isFinite(h)) return null;
  return TURNOS.find((t) => h >= t.de && h < t.ate)?.valor ?? null;
}

/** Dia da semana de "AAAA-MM-DD" sem passar por fuso (0 = domingo). */
export function diaDaSemana(data: string) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Base do público: quantos hóspedes daquele público estavam no hotel no dia. */
export function basePublico(publico: string | null, oc: Ocupacao | undefined) {
  if (!oc || !publico) return null;
  if (publico === "Adulto") return oc.adultos || null;
  if (publico === "Infantil") return oc.criancas || null;
  if (publico === "Familiar") return oc.adultos + oc.criancas || null;
  return null;
}

export function filtrarRegistros(registros: RegistroAtividade[], f: FiltrosRecreacao) {
  return registros.filter(
    (r) =>
      (!f.de || r.data >= f.de) &&
      (!f.ate || r.data <= f.ate) &&
      (!f.atividade || r.atividade === f.atividade) &&
      (!f.responsavel || r.responsavelId === f.responsavel) &&
      (!f.publico || (f.publico === "nao_informado" ? !r.publico : r.publico === f.publico)) &&
      (!f.turno || turnoDaHora(r.hora) === f.turno),
  );
}

export function mediana(valores: number[]) {
  if (!valores.length) return null;
  const v = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

const media = (v: number[]) => (v.length ? v.reduce((s, n) => s + n, 0) / v.length : null);

type Linha = {
  chave: string;
  nome: string;
  publico?: string | null;
  realizacoes: number;
  participacoes: number;
  media: number;
  /** Média dos hóspedes do público nos dias das atividades. */
  baseMedia: number | null;
  /** Média das taxas (cada atividade pesa igual). */
  adesaoMedia: number | null;
  /** Soma das participações ÷ soma das bases (atividade cheia pesa mais). */
  adesaoPonderada: number | null;
};

function linha(chave: string, nome: string, regs: RegistroAtividade[], ocupacao: Map<string, Ocupacao>, publico?: string | null): Linha {
  const comBase = regs
    .map((r) => ({ r, base: basePublico(r.publico, ocupacao.get(r.data)) }))
    .filter((x): x is { r: RegistroAtividade; base: number } => x.base !== null);
  const part = regs.reduce((s, r) => s + r.participantes, 0);
  const somaBase = comBase.reduce((s, x) => s + x.base, 0);
  return {
    chave,
    nome,
    publico,
    realizacoes: regs.length,
    participacoes: part,
    media: regs.length ? part / regs.length : 0,
    baseMedia: media(comBase.map((x) => x.base)),
    adesaoMedia: media(comBase.map((x) => x.r.participantes / x.base)),
    adesaoPonderada: somaBase ? comBase.reduce((s, x) => s + x.r.participantes, 0) / somaBase : null,
  };
}

function agrupar<K>(regs: RegistroAtividade[], chave: (r: RegistroAtividade) => K) {
  const mapa = new Map<K, RegistroAtividade[]>();
  for (const r of regs) {
    const k = chave(r);
    mapa.set(k, [...(mapa.get(k) ?? []), r]);
  }
  return mapa;
}

export function metricasRecreacao(
  registros: RegistroAtividade[],
  ocupacao: Map<string, Ocupacao>,
  periodo: { de: string; ate: string },
) {
  const part = registros.map((r) => r.participantes);
  const total = part.reduce((s, n) => s + n, 0);
  const geral = linha("geral", "Geral", registros, ocupacao);

  const diasOcupacao = [...ocupacao.entries()].filter(([d]) => (!periodo.de || d >= periodo.de) && (!periodo.ate || d <= periodo.ate));
  const diasComAtividade = new Set(registros.map((r) => r.data));
  const diasSemOcupacao = [...diasComAtividade].filter((d) => !ocupacao.has(d)).sort();

  const porPublico: { publico: string; participacoes: number }[] = PUBLICOS.map((p) => ({
    publico: p,
    participacoes: registros.filter((r) => r.publico === p).reduce((s, r) => s + r.participantes, 0),
  }));
  const semPublico = registros.filter((r) => !r.publico).reduce((s, r) => s + r.participantes, 0);
  if (semPublico) porPublico.push({ publico: "Não informado", participacoes: semPublico });

  const porAtividadePublico = [...agrupar(registros, (r) => `${r.atividade}|${r.publico ?? ""}`).entries()]
    .map(([k, regs]) => linha(k, regs[0].atividade, regs, ocupacao, regs[0].publico))
    .sort((a, b) => b.participacoes - a.participacoes || a.nome.localeCompare(b.nome));

  const porAtividade = [...agrupar(registros, (r) => r.atividade).entries()]
    .map(([k, regs]) => linha(k, k, regs, ocupacao))
    .sort((a, b) => b.participacoes - a.participacoes || a.nome.localeCompare(b.nome));

  const porResponsavel = [...agrupar(registros, (r) => r.responsavelId ?? r.responsavel).entries()]
    .map(([k, regs]) => linha(k, regs[0].responsavel, regs, ocupacao))
    .sort((a, b) => b.participacoes - a.participacoes || a.nome.localeCompare(b.nome));

  const porHorario = [...agrupar(registros.filter((r) => r.hora), (r) => r.hora!.slice(0, 2)).entries()]
    .map(([h, regs]) => ({ hora: `${h}:00`, realizacoes: regs.length, media: regs.reduce((s, r) => s + r.participantes, 0) / regs.length }))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const porDiaSemana = DIAS_SEMANA.map((nome, i) => {
    const regs = registros.filter((r) => diaDaSemana(r.data) === i);
    return { dia: nome, realizacoes: regs.length, participacoes: regs.reduce((s, r) => s + r.participantes, 0) };
  });

  const porDia = [...agrupar(registros, (r) => r.data).entries()]
    .map(([data, regs]) => {
      const oc = ocupacao.get(data);
      return {
        data,
        realizacoes: regs.length,
        participacoes: regs.reduce((s, r) => s + r.participantes, 0),
        hospedes: oc ? oc.adultos + oc.criancas : null,
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    realizadas: registros.length,
    participacoes: total,
    mediaPorAtividade: registros.length ? total / registros.length : null,
    mediana: mediana(part),
    maior: part.length ? Math.max(...part) : null,
    menor: part.length ? Math.min(...part) : null,
    atividadesDiferentes: new Set(registros.map((r) => r.atividade)).size,
    responsaveis: new Set(registros.map((r) => r.responsavelId ?? r.responsavel)).size,
    adesaoPonderada: geral.adesaoPonderada,
    adesaoMedia: geral.adesaoMedia,
    mediaHospedes: media(diasOcupacao.map(([, o]) => o.adultos + o.criancas)),
    diasComOcupacao: diasOcupacao.length,
    diasSemOcupacao,
    semParticipantes: registros.filter((r) => r.participantes === 0).length,
    porPublico,
    porAtividadePublico,
    porAtividade,
    porResponsavel,
    porHorario,
    porDiaSemana,
    porDia,
  };
}

export function lerFiltrosRecreacao(p: Partial<Record<keyof FiltrosRecreacao, string>>, hoje: string): FiltrosRecreacao {
  const data = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const [a, m] = hoje.split("-");
  return {
    de: data(p.de) || `${a}-${m}-01`,
    ate: data(p.ate) || hoje,
    atividade: p.atividade ?? "",
    responsavel: p.responsavel ?? "",
    publico: p.publico ?? "",
    turno: TURNOS.some((t) => t.valor === p.turno) ? p.turno! : "",
  };
}

export function porcentagem(v: number | null | undefined, casas = 1) {
  return v === null || v === undefined ? "–" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas })}%`;
}

export function decimal(v: number | null | undefined, casas = 1) {
  return v === null || v === undefined ? "–" : v.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas });
}
