/**
 * Leitura do "Relatório de UHs para Governança - Resumido" do Desbravador (PDF)
 * e classificação de cada UH no dia do relatório: saída, chegada, permanência ou vaga.
 */

/** Pedaço de texto do PDF com a posição na página (y cresce para baixo). */
export type TextoPdf = { pagina: number; x: number; y: number; texto: string };

export type Situacao = string;

export type UhRelatorio = {
  numero: string;
  tipo: string;
  situacao: Situacao;
  motivo: string;
  edificacao: string;
  andar: string;
  /** dd/mm/aaaa ou null. */
  dataIn: string | null;
  dataOut: string | null;
  pax: number;
  /** Serviços agendados: Limpeza, Retoque, Inspeção... */
  servicos: string[];
  /** Coluna "Trocar" marcada (troca de enxoval). */
  trocar: boolean;
  /** Coluna "Previsão in": hóspedes previstos para chegar no dia, ou null. */
  previsaoIn: number | null;
  observacao: string;
};

export type RelatorioUhs = {
  /** Data do relatório em dd/mm/aaaa. */
  data: string;
  /** Data e hora em que o relatório foi tirado do Desbravador, como veio no PDF. */
  emitidoEm: string | null;
  uhs: UhRelatorio[];
};

/**
 * Início de cada coluna (em pontos) no layout do relatório. O cabeçalho do PDF
 * junta alguns títulos num texto só, então as posições ficam fixas aqui.
 */
const COLUNAS = [
  ["numero", 0],
  ["tipo", 60],
  ["situacao", 100],
  ["motivo", 155],
  ["dataIn", 205],
  ["dataOut", 248],
  ["pax", 288],
  ["servico", 308],
  ["trocar", 378],
  ["previsao", 405],
  ["observacao", 448],
] as const;

type Coluna = (typeof COLUNAS)[number][0];

function colunaDe(x: number): Coluna {
  let atual: Coluna = "numero";
  for (const [nome, inicio] of COLUNAS) if (x >= inicio - 2) atual = nome;
  return atual;
}

const RE_NUMERO_UH = /^\d{3,5}$/;
const RE_DATA_CURTA = /^(\d{2})\/(\d{2})\/(\d{2,4})$/;

/** "21/10/26" → "21/10/2026". */
export function dataCompleta(texto: string): string | null {
  const m = RE_DATA_CURTA.exec(texto.trim());
  if (!m) return null;
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${m[1]}/${m[2]}/${ano}`;
}

/** "21/10/2026" → "2026-10-21" (para comparar e gravar no banco). */
export function dataIso(ddmmaaaa: string): string {
  const [d, m, a] = ddmmaaaa.split("/");
  return `${a}-${m}-${d}`;
}

/** Agrupa os textos em linhas (mesma página e mesma altura) na ordem de leitura. */
function agruparLinhas(textos: TextoPdf[]) {
  const ordenados = [...textos]
    .filter((t) => t.texto.trim())
    .sort((a, b) => a.pagina - b.pagina || a.y - b.y || a.x - b.x);
  const linhas: TextoPdf[][] = [];
  for (const t of ordenados) {
    const ultima = linhas[linhas.length - 1];
    if (ultima && ultima[0].pagina === t.pagina && Math.abs(ultima[0].y - t.y) <= 3) {
      ultima.push(t);
    } else {
      linhas.push([t]);
    }
  }
  return linhas.map((l) => l.sort((a, b) => a.x - b.x));
}

function novaUh(numero: string, edificacao: string, andar: string): UhRelatorio {
  return {
    numero,
    tipo: "",
    situacao: "",
    motivo: "",
    edificacao,
    andar,
    dataIn: null,
    dataOut: null,
    pax: 0,
    servicos: [],
    trocar: false,
    previsaoIn: null,
    observacao: "",
  };
}

/** Preenche a UH com os textos de uma linha (a linha da UH ou a continuação dela). */
function preencher(uh: UhRelatorio, linha: TextoPdf[]) {
  for (const t of linha) {
    const texto = t.texto.trim();
    const coluna = colunaDe(t.x);
    if (coluna === "numero") continue;
    if (coluna === "tipo") {
      // Às vezes o tipo e a situação vêm juntos ("GDF Ocupada").
      const [tipo, ...resto] = texto.split(/\s+/);
      uh.tipo = tipo;
      if (resto.length) uh.situacao = resto.join(" ");
    } else if (coluna === "situacao") {
      uh.situacao = texto;
    } else if (coluna === "motivo") {
      uh.motivo = [uh.motivo, texto].filter(Boolean).join(" ");
    } else if (coluna === "dataIn" || coluna === "dataOut") {
      // Datas também podem vir juntas num texto só.
      const datas = texto.split(/\s+/).map(dataCompleta).filter((d): d is string => !!d);
      if (coluna === "dataIn") {
        uh.dataIn = datas[0] ?? uh.dataIn;
        if (datas[1]) uh.dataOut = datas[1];
      } else {
        uh.dataOut = datas[0] ?? uh.dataOut;
      }
    } else if (coluna === "pax") {
      const n = Number.parseInt(texto, 10);
      if (Number.isFinite(n)) uh.pax = n;
    } else if (coluna === "servico") {
      const servico = texto.replace(/^\[\s*\]\s*/, "").trim();
      if (servico && !uh.servicos.includes(servico)) uh.servicos.push(servico);
    } else if (coluna === "trocar") {
      if (/^sim/i.test(texto)) uh.trocar = true;
    } else if (coluna === "previsao") {
      const m = /sim\s*\((\d+)\)/i.exec(texto);
      if (m) uh.previsaoIn = Number(m[1]);
      else if (/^sim/i.test(texto)) uh.previsaoIn = 0;
    } else {
      uh.observacao = [uh.observacao, texto].filter(Boolean).join(" ");
    }
  }
}

const RE_DATA_RELATORIO = /Data:\s*(\d{2}\/\d{2}\/\d{4})/;
const RE_EMISSAO = /(\d{1,2}) de (\w+) de (\d{4})\s+(\d{2}:\d{2})/;
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Monta o relatório a partir dos textos do PDF. Lança erro se não for o relatório certo. */
export function lerRelatorioUhs(textos: TextoPdf[]): RelatorioUhs {
  let data: string | null = null;
  let emitidoEm: string | null = null;
  let edificacao = "";
  let andar = "";
  let atual: UhRelatorio | null = null;
  const uhs: UhRelatorio[] = [];

  for (const linha of agruparLinhas(textos)) {
    const conteudo = linha.map((t) => t.texto.trim()).join(" ");

    const mData = RE_DATA_RELATORIO.exec(conteudo);
    if (mData && !data) data = mData[1];

    const mEmissao = RE_EMISSAO.exec(conteudo);
    if (mEmissao && !emitidoEm) {
      const mes = MESES.indexOf(mEmissao[2].toLowerCase()) + 1;
      if (mes > 0) {
        emitidoEm = `${mEmissao[1].padStart(2, "0")}/${String(mes).padStart(2, "0")}/${mEmissao[3]} ${mEmissao[4]}`;
      }
    }

    if (/Edifica[çc][ãa]o:/i.test(conteudo)) {
      const mEd = /Edifica[çc][ãa]o:\s*(\S+)/i.exec(conteudo);
      const mAndar = /Andar:\s*(\S+)/i.exec(conteudo);
      if (mEd && !/^todas$/i.test(mEd[1])) edificacao = mEd[1];
      if (mAndar && !/^todos$/i.test(mAndar[1])) andar = mAndar[1];
      continue;
    }

    // Totais, rodapé, cabeçalhos e filtros encerram a UH anterior ou são ignorados.
    if (/^(Livre:|Total )/i.test(conteudo)) {
      atual = null;
      continue;
    }
    if (
      /^(Identificador|Relat[óo]rio de UHs|Desbravador|Estabelecimento|VILLANUEVA)/i.test(conteudo) ||
      /Situa[çc][ãa]o\b.*\bPAX\b/i.test(conteudo)
    ) {
      continue;
    }

    const primeiro = linha[0];
    if (colunaDe(primeiro.x) === "numero" && RE_NUMERO_UH.test(primeiro.texto.trim())) {
      atual = novaUh(primeiro.texto.trim(), edificacao, andar);
      uhs.push(atual);
      preencher(atual, linha);
    } else if (atual && linha.every((t) => colunaDe(t.x) !== "numero")) {
      // Continuação da UH de cima (outro serviço agendado, ou datas que caíram na página seguinte).
      preencher(atual, linha);
    }
  }

  if (!data || uhs.length === 0) {
    throw new Error(
      "Não reconheci o arquivo. Envie o PDF \"Relatório de UHs para Governança - Resumido\" do Desbravador.",
    );
  }

  return { data, emitidoEm, uhs };
}

// ---- Classificação do dia ----

export type Movimento = "saida" | "chegada" | "permanencia" | "vaga";

export const MOVIMENTO_LABEL: Record<Movimento, string> = {
  saida: "Saída",
  chegada: "Chegada",
  permanencia: "Permanência",
  vaga: "Vaga",
};

export type UhDoDia = UhRelatorio & {
  /** Movimentos da UH no dia: uma UH pode ter saída e chegada no mesmo dia. */
  movimentos: Movimento[];
  /** Hóspede da chegada já fez check-in. */
  jaChegou: boolean;
  /** A UH precisa de limpeza ou arrumação hoje. */
  precisaLimpar: boolean;
  /** O que a governança tem que fazer na UH. */
  tarefa: string;
};

const ehSuja = (s: string) => /suja/i.test(s);
const ehOcupada = (s: string) => /ocupada/i.test(s);

/** Classifica a UH no dia do relatório (dd/mm/aaaa). */
export function classificarUh(uh: UhRelatorio, dia: string): UhDoDia {
  const saida = uh.dataOut === dia;
  const entrouHoje = uh.dataIn === dia;
  const chegada = uh.previsaoIn !== null || entrouHoje;
  // Hóspede que entrou hoje e já está no quarto: não tem mais chegada pendente.
  const jaChegou = entrouHoje && uh.previsaoIn === null && ehOcupada(uh.situacao);
  const permanencia =
    !saida &&
    !entrouHoje &&
    ehOcupada(uh.situacao) &&
    (uh.dataOut === null || compararData(uh.dataOut, dia) > 0);

  const movimentos: Movimento[] = [];
  if (saida) movimentos.push("saida");
  if (chegada) movimentos.push("chegada");
  if (!saida && !chegada && permanencia) movimentos.push("permanencia");
  if (movimentos.length === 0) movimentos.push("vaga");

  const limpezaAgendada = uh.servicos.some((s) => /limpeza|retoque/i.test(s));
  const tarefas: string[] = [];
  if (saida) tarefas.push(ehOcupada(uh.situacao) ? "Limpeza de saída (aguardando check-out)" : "Limpeza de saída");
  else if (movimentos.includes("permanencia")) tarefas.push("Arrumação");
  else if (chegada && !jaChegou && (ehSuja(uh.situacao) || limpezaAgendada)) tarefas.push("Limpar antes da chegada");
  else if (ehSuja(uh.situacao)) tarefas.push("Limpeza");
  else if (limpezaAgendada) {
    tarefas.push(uh.servicos.filter((s) => /limpeza|retoque/i.test(s)).join(" + "));
  }
  if (uh.trocar) tarefas.push("troca de enxoval");
  if (chegada && !jaChegou && !tarefas.length) tarefas.push("Conferir antes da chegada");

  const precisaLimpar =
    saida || movimentos.includes("permanencia") || ehSuja(uh.situacao) || limpezaAgendada;

  return {
    ...uh,
    movimentos,
    jaChegou,
    precisaLimpar,
    tarefa: tarefas.length ? capitalizar(tarefas.join(" + ")) : "",
  };
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Compara datas dd/mm/aaaa. */
export function compararData(a: string, b: string) {
  return dataIso(a).localeCompare(dataIso(b));
}

/** Classifica todas as UHs do relatório na data dele. */
export function uhsDoDia(relatorio: Pick<RelatorioUhs, "data" | "uhs">): UhDoDia[] {
  return relatorio.uhs.map((uh) => classificarUh(uh, relatorio.data));
}

export function resumoDoDia(uhs: UhDoDia[]) {
  const conta = (m: Movimento) => uhs.filter((u) => u.movimentos.includes(m)).length;
  return {
    saidas: conta("saida"),
    chegadas: conta("chegada"),
    permanencias: conta("permanencia"),
    vagas: conta("vaga"),
    saidaEChegada: uhs.filter((u) => u.movimentos.includes("saida") && u.movimentos.includes("chegada")).length,
    limpar: uhs.filter((u) => u.precisaLimpar).length,
  };
}

/** Ordena números de UH do menor para o maior (1200 antes de 1250, 999 antes de 1000). */
export function compararNumeroUh(a: string, b: string) {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, "pt-BR", { numeric: true });
}

/** A UH entra na lista do dia: situação Suja ou serviço de Limpeza agendado. */
export function marcadaParaLimpeza(uh: Pick<UhRelatorio, "situacao" | "servicos">) {
  return ehSuja(uh.situacao) || uh.servicos.some((s) => /limpeza/i.test(s));
}

/** UHs para limpar no dia do relatório (Suja ou com Limpeza agendada), do menor para o maior número. */
export function uhsParaLimpar(relatorio: Pick<RelatorioUhs, "data" | "uhs">): UhDoDia[] {
  const vistas = new Set<string>();
  return uhsDoDia(relatorio)
    .filter((u) => {
      if (!marcadaParaLimpeza(u) || vistas.has(u.numero)) return false;
      vistas.add(u.numero);
      return true;
    })
    .sort((a, b) => compararNumeroUh(a.numero, b.numero));
}
