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
  camareira: "Camareira",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

/** Admin do sistema é admin da governança; os demais dependem do campo do usuário. */
export function papelGovernanca(
  role: string | null | undefined,
  governancaPapel: string | null | undefined,
): GovPapel | null {
  if (role === "admin") return "admin";
  if (governancaPapel === "lider" || governancaPapel === "camareira") {
    return governancaPapel;
  }
  return null;
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

export type RespostaParcial = {
  resposta: RespostaValor | null;
  plano: { o_que_fazer: string } | null;
};

/** Seção pronta: tudo respondido e todo "Não" com o que precisa ser feito. */
export function secaoCompleta(
  perguntas: { id: string }[],
  respostas: Record<string, RespostaParcial | undefined>,
) {
  return perguntas.every((q) => {
    const r = respostas[q.id];
    if (!r || r.resposta === null) return false;
    if (r.resposta === "nao" && !r.plano?.o_que_fazer.trim()) return false;
    return true;
  });
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
