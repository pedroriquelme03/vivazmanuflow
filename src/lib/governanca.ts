import type { Tables } from "@/lib/database.types";

export type GovPapel = "admin" | "lider" | "camareira";
export type TipoAcomodacao = "suite" | "apartamento";
export type TipoProcesso = TipoAcomodacao | "ambos";
export type Prioridade = "baixa" | "media" | "alta";
export type RespostaValor = "sim" | "nao";

export type Acomodacao = Tables<"gov_acomodacoes">;
export type Camareira = Tables<"gov_camareiras">;
export type Processo = Tables<"gov_processos">;
export type Secao = Tables<"gov_secoes">;
export type Pergunta = Tables<"gov_perguntas">;
export type SecaoComPerguntas = Secao & { gov_perguntas: Pergunta[] };

export const BUCKET_GOVERNANCA = "governanca";

export const MIGRATION_HINT_GOV =
  "Tabelas da governança ainda não existem. Rode o SQL em supabase/migrations/20261019160000_governanca_checklist.sql no Supabase.";

export const PAPEL_GOV_LABEL: Record<GovPapel, string> = {
  admin: "Administrador",
  lider: "Líder",
  camareira: "Aplicador",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

/**
 * Só entra nos checklists quem tem o ambiente Checklist marcado. O admin do
 * sistema é admin do checklist; os demais são líder ou aplicador (padrão).
 */
export function papelGovernanca(
  role: string | null | undefined,
  governancaPapel: string | null | undefined,
  ambientes: readonly string[] | null | undefined,
): GovPapel | null {
  if (!(ambientes ?? []).includes("checklist")) return null;
  if (role === "solicitante") return null;
  if (role === "admin") return "admin";
  if (governancaPapel === "lider") return "lider";
  return "camareira";
}

/** Líder e admin escolhem a camareira e veem todas as inspeções. */
export function inspecionaEquipe(papel: GovPapel | null) {
  return papel === "admin" || papel === "lider";
}

export function rotuloTipo(tipo: string, curto = false) {
  if (tipo === "suite") return "Suíte";
  return curto ? "Apto" : "Apartamento";
}

export function rotuloTipoProcesso(tipo: string) {
  if (tipo === "ambos") return "Ambos";
  return tipo === "suite" ? "Suítes" : "Apartamentos";
}

/** Onde o checklist se aplica: tipo de UH ou nenhum. */
export function rotuloAplicacao(p: { usa_acomodacao: boolean; tipo: string }) {
  return p.usa_acomodacao ? rotuloTipoProcesso(p.tipo) : "Sem UH";
}

export function formatDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function erroSchemaGov(msg: string, code?: string) {
  return (
    code === "42P01" ||
    msg.includes("schema cache") ||
    msg.includes("gov_") ||
    msg.includes("governanca_papel")
  );
}

/** Filtra as UHs pelo andar (prefixo) e pela busca de número ou tipo. */
export function filtrarAcomodacoes(
  lista: Acomodacao[],
  busca: string,
  prefixoAndar: string | null,
) {
  const q = busca.trim().toLowerCase();
  return lista.filter((a) => {
    if (prefixoAndar && !a.numero.startsWith(prefixoAndar)) return false;
    if (!q) return true;
    const tipoLabel = a.tipo === "suite" ? "suite suíte" : "apto apartamento";
    return a.numero.toLowerCase().includes(q) || tipoLabel.includes(q);
  });
}

export function ordenarSecoes(secoes: SecaoComPerguntas[]): SecaoComPerguntas[] {
  return [...secoes]
    .sort((a, b) => a.ordem - b.ordem)
    .map((s) => ({
      ...s,
      gov_perguntas: [...(s.gov_perguntas ?? [])].sort((x, y) => x.ordem - y.ordem),
    }));
}

export function proximaOrdem(itens: { ordem: number }[]) {
  return itens.length ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1;
}

// ---- Tipos de item ----

export const TIPOS_ITEM = [
  "sim_nao",
  "carinhas",
  "texto_curto",
  "texto_longo",
  "numero",
  "decimal",
  "porcentagem",
  "data",
  "mes_ano",
  "hora",
  "selecao_unica",
  "selecao_multipla",
] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];

export const TIPO_ITEM_LABEL: Record<TipoItem, string> = {
  sim_nao: "Sim / Não",
  carinhas: "Carinhas (ruim, regular, bom)",
  texto_curto: "Texto curto",
  texto_longo: "Texto longo",
  numero: "Número inteiro",
  decimal: "Número decimal",
  porcentagem: "Porcentagem",
  data: "Data",
  mes_ano: "Mês/ano",
  hora: "Hora",
  selecao_unica: "Lista (uma opção)",
  selecao_multipla: "Lista (várias opções)",
};

export const CARINHAS = [
  { valor: "ruim", rotulo: "Ruim", emoji: "☹️" },
  { valor: "regular", rotulo: "Regular", emoji: "😐" },
  { valor: "bom", rotulo: "Bom", emoji: "🙂" },
] as const;

export function tipoItem(valor: string | null | undefined): TipoItem {
  return (TIPOS_ITEM as readonly string[]).includes(valor ?? "") ? (valor as TipoItem) : "sim_nao";
}

export function tipoTemOpcoes(tipo: string) {
  return tipo === "selecao_unica" || tipo === "selecao_multipla";
}

export type RespostaParcial = {
  resposta: RespostaValor | "na" | null;
  valor?: string;
  selecionadas?: string[];
  plano: { o_que_fazer: string } | null;
};

type ItemRegra = {
  id: string;
  tipo?: string;
  obrigatoria?: boolean;
  plano_acao?: boolean;
};

/**
 * Item pronto para seguir. Obrigatório precisa de resposta (ou N/A);
 * "Não" com plano de ação precisa do que fazer, mesmo se o item for opcional.
 */
export function itemRespondido(item: ItemRegra, r: RespostaParcial | undefined) {
  const obrigatoria = item.obrigatoria ?? true;
  const tipo = tipoItem(item.tipo);
  if (r?.resposta === "na") return true;
  if (tipo === "sim_nao") {
    if (!r || r.resposta === null) return !obrigatoria;
    if (r.resposta === "nao" && (item.plano_acao ?? true) && !r.plano?.o_que_fazer.trim()) {
      return false;
    }
    return true;
  }
  const preenchido =
    tipo === "selecao_multipla"
      ? (r?.selecionadas?.length ?? 0) > 0
      : Boolean(r?.valor?.trim());
  return preenchido || !obrigatoria;
}

/** Seção pronta: todos os itens prontos para seguir. */
export function secaoCompleta(
  perguntas: ItemRegra[],
  respostas: Record<string, RespostaParcial | undefined>,
) {
  return perguntas.every((q) => itemRespondido(q, respostas[q.id]));
}

// ---- Kanban ----

export type ColunaKanban = "andamento" | "ok" | "pendencia" | "resolvida";

export const COLUNAS_KANBAN: { id: ColunaKanban; titulo: string; ajuda: string }[] = [
  { id: "andamento", titulo: "Em andamento", ajuda: "Sendo preenchidos agora" },
  { id: "ok", titulo: "Finalizado sem problema", ajuda: "Sem plano de ação aberto" },
  { id: "pendencia", titulo: "Com pendência", ajuda: "Plano de ação aguardando" },
  { id: "resolvida", titulo: "Pendência resolvida", ajuda: "Todos os planos resolvidos" },
];

/**
 * Coluna do Kanban: em andamento enquanto não finaliza; depois, pendência se
 * algum "Não" abriu plano de ação ainda não resolvido.
 */
export function colunaKanban(inspecao: {
  status: string;
  planos: { resolvido_em: string | null }[];
}): ColunaKanban {
  if (inspecao.status !== "finalizada") return "andamento";
  if (inspecao.planos.length === 0) return "ok";
  return inspecao.planos.some((p) => !p.resolvido_em) ? "pendencia" : "resolvida";
}

/** "há 12 min", "há 3 h", "há 2 dias" a partir de um horário. */
export function tempoDesde(iso: string, agora: number) {
  const minutos = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

/** Ao continuar um checklist em andamento, volta na primeira seção com item pendente. */
export function secaoParaRetomar(
  secoes: { gov_perguntas: ItemRegra[] }[],
  respostas: Record<string, RespostaParcial | undefined>,
) {
  const comItens = secoes
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.gov_perguntas.length > 0);
  if (comItens.length === 0) return 0;
  const pendente = comItens.find(({ s }) => !secaoCompleta(s.gov_perguntas, respostas));
  return (pendente ?? comItens[comItens.length - 1]).i;
}

/** Valor gravado de um item que não é Sim/Não, do jeito que a pessoa lê. */
export function formatarValor(tipo: string, valor: string | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return "—";
  switch (tipoItem(tipo)) {
    case "data": {
      const [a, m, d] = valor.split("-");
      return d ? `${d}/${m}/${a}` : valor;
    }
    case "mes_ano": {
      const [a, m] = valor.split("-");
      return m ? `${m}/${a}` : valor;
    }
    case "porcentagem":
      return `${valor}%`;
    case "decimal":
      return valor.replace(".", ",");
    case "carinhas": {
      const c = CARINHAS.find((x) => x.valor === valor);
      return c ? `${c.emoji} ${c.rotulo}` : valor;
    }
    case "selecao_multipla":
      try {
        const lista = JSON.parse(valor);
        return Array.isArray(lista) ? lista.join(" · ") : valor;
      } catch {
        return valor;
      }
    default:
      return valor;
  }
}

/** Subgrupos de uma seção, na ordem em que aparecem. */
export function agruparPorGrupo<T extends { grupo: string | null }>(itens: T[]) {
  const grupos: { grupo: string | null; itens: T[] }[] = [];
  for (const item of itens) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.grupo === item.grupo) ultimo.itens.push(item);
    else grupos.push({ grupo: item.grupo, itens: [item] });
  }
  return grupos;
}

/** Checklists agrupados pela categoria (sem categoria fica por último). */
export function agruparPorCategoria<T extends { categoria: string | null; nome: string }>(
  lista: T[],
) {
  const mapa = new Map<string, T[]>();
  for (const p of lista) {
    const c = p.categoria?.trim() || "Outros";
    mapa.set(c, [...(mapa.get(c) ?? []), p]);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => (a === "Outros" ? 1 : b === "Outros" ? -1 : a.localeCompare(b, "pt-BR")))
    .map(([categoria, itens]) => ({
      categoria,
      itens: [...itens].sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR")),
    }));
}

/** Busca sem diferenciar acento nem maiúscula. */
export function normalizarBusca(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type ItemSecao = {
  secao_nome: string;
  secao_ordem: number;
  pergunta_ordem: number;
};

export function agruparPorSecao<T extends ItemSecao>(itens: T[]) {
  const mapa = new Map<string, { nome: string; ordem: number; itens: T[] }>();
  for (const r of itens) {
    const chave = `${r.secao_ordem}|${r.secao_nome}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, { nome: r.secao_nome, ordem: r.secao_ordem, itens: [] });
    }
    mapa.get(chave)!.itens.push(r);
  }
  const grupos = [...mapa.values()].sort((a, b) => a.ordem - b.ordem);
  for (const g of grupos) g.itens.sort((a, b) => a.pergunta_ordem - b.pergunta_ordem);
  return grupos;
}

// ---- Relatórios ----

export type Periodo = "7" | "30" | "90" | "todos";

export function inicioPeriodo(periodo: Periodo, agora = new Date()): Date | null {
  if (periodo === "todos") return null;
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - Number(periodo));
  return d;
}

export function conformidade(sim: number, nao: number) {
  const total = sim + nao;
  return total > 0 ? Math.round((sim / total) * 100) : 0;
}

type InspecaoRel = { id: string; camareira: string | null };
type RespostaRel = {
  inspecao_id: string;
  resposta: string | null;
  pergunta_texto: string;
};

export function resumoPorCamareira(inspecoes: InspecaoRel[], respostas: RespostaRel[]) {
  const SEM = "Sem camareira";
  const mapa = new Map<string, { nome: string; inspecoes: number; sim: number; nao: number }>();
  const nomePorInspecao = new Map<string, string>();
  for (const i of inspecoes) {
    const nome = i.camareira ?? SEM;
    nomePorInspecao.set(i.id, nome);
    if (!mapa.has(nome)) mapa.set(nome, { nome, inspecoes: 0, sim: 0, nao: 0 });
    mapa.get(nome)!.inspecoes += 1;
  }
  for (const r of respostas) {
    const nome = nomePorInspecao.get(r.inspecao_id);
    const linha = nome ? mapa.get(nome) : undefined;
    if (!linha) continue;
    if (r.resposta === "sim") linha.sim += 1;
    if (r.resposta === "nao") linha.nao += 1;
  }
  return [...mapa.values()].sort((a, b) => b.nao - a.nao || b.inspecoes - a.inspecoes);
}

/** Checklist em andamento há mais que isso aparece como parado. */
export const MINUTOS_PARADO = 120;

function minutosEntre(inicio: string, fim: string | number) {
  const ate = typeof fim === "number" ? fim : new Date(fim).getTime();
  return Math.max(0, (ate - new Date(inicio).getTime()) / 60000);
}

function media(valores: number[]) {
  return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
}

/** "45 min", "2 h 10 min", "3 dias" para tempos médios. */
export function formatarDuracao(minutos: number | null) {
  if (minutos === null) return "—";
  const m = Math.round(minutos);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  return `${Math.round(h / 24)} dias`;
}

type InspecaoAndamento = {
  id: string;
  status: string;
  criado_em: string;
  finalizada_em: string | null;
  aplicador?: string | null;
};
type PlanoRel = { criado_em: string; resolvido_em: string | null };

/** Números do andamento: quem está preenchendo, quanto demora e as pendências. */
export function indicadoresAndamento(
  inspecoes: InspecaoAndamento[],
  planos: PlanoRel[],
  agora = Date.now(),
) {
  const emAndamento = inspecoes.filter((i) => i.status !== "finalizada");
  const finalizadas = inspecoes.filter((i) => i.status === "finalizada" && i.finalizada_em);
  const resolvidos = planos.filter((p) => p.resolvido_em);
  return {
    emAndamento: emAndamento.length,
    parados: emAndamento.filter((i) => minutosEntre(i.criado_em, agora) > MINUTOS_PARADO).length,
    tempoPreenchimento: media(finalizadas.map((i) => minutosEntre(i.criado_em, i.finalizada_em!))),
    planosAbertos: planos.length - resolvidos.length,
    planosResolvidos: resolvidos.length,
    tempoResolucao: media(resolvidos.map((p) => minutosEntre(p.criado_em, p.resolvido_em!))),
  };
}

/** Quanto cada aplicador preencheu, quanto demora e a conformidade do que fez. */
export function resumoPorAplicador(inspecoes: InspecaoAndamento[], respostas: RespostaRel[]) {
  const SEM = "Sem nome";
  const mapa = new Map<
    string,
    { nome: string; finalizadas: number; emAndamento: number; sim: number; nao: number; tempos: number[] }
  >();
  const nomePorInspecao = new Map<string, string>();
  for (const i of inspecoes) {
    const nome = i.aplicador ?? SEM;
    nomePorInspecao.set(i.id, nome);
    const linha =
      mapa.get(nome) ?? { nome, finalizadas: 0, emAndamento: 0, sim: 0, nao: 0, tempos: [] };
    if (i.status === "finalizada") {
      linha.finalizadas += 1;
      if (i.finalizada_em) linha.tempos.push(minutosEntre(i.criado_em, i.finalizada_em));
    } else {
      linha.emAndamento += 1;
    }
    mapa.set(nome, linha);
  }
  for (const r of respostas) {
    const linha = mapa.get(nomePorInspecao.get(r.inspecao_id) ?? "");
    if (!linha) continue;
    if (r.resposta === "sim") linha.sim += 1;
    if (r.resposta === "nao") linha.nao += 1;
  }
  return [...mapa.values()]
    .map(({ tempos, ...linha }) => ({ ...linha, tempoMedio: media(tempos) }))
    .sort((a, b) => b.finalizadas - a.finalizadas || b.emAndamento - a.emAndamento);
}

export function itensMaisReprovados(respostas: RespostaRel[], limite = 10) {
  const mapa = new Map<string, number>();
  for (const r of respostas) {
    if (r.resposta !== "nao") continue;
    mapa.set(r.pergunta_texto, (mapa.get(r.pergunta_texto) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([texto, qtd]) => ({ texto, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, limite);
}
