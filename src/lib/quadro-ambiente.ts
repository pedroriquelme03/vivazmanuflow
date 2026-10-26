import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/lib/database.types";
import type { AmbienteEquipe } from "@/lib/ambiente-equipe";
import { DEMANDA_SELECT, type DemandaKanban } from "@/lib/demanda-select";

type Cliente = SupabaseClient<Database>;

const SELECT_SISTEMA = `${DEMANDA_SELECT}, sistema_id, sistema:sistemas(nome)`;
const CAMPOS_ALERTA = `
  sentry_issue_id, sentry_ocorrencias, sentry_usuarios,
  sentry_primeira_em, sentry_ultima_em, sentry_rota,
  sentry_quadro, sentry_url, sentry_posthog_url
`;

/** O Supabase devolve no máximo 1000 linhas por consulta. */
const TAMANHO_PAGINA = 1000;

/** Concluídas vêm à parte, de 50 em 50. */
export const CONCLUIDAS_POR_PAGINA = 50;

/** Fora da coluna Concluídas: o resto do quadro e tudo que está arquivado. */
const SEM_CONCLUIDAS = "status.neq.concluida,arquivado.eq.true";

function faltaSistema(mensagem: string) {
  return mensagem.includes("sistemas") || mensagem.includes("sistema_id");
}

function faltaAlerta(mensagem: string) {
  return mensagem.includes("sentry_");
}

/**
 * Busca de página em página até acabar. Sem isso, passando de 1000 demandas,
 * as últimas da ordem (peso baixo e mais novas) sumiam do quadro.
 */
async function todasAsPaginas(
  supabase: Cliente,
  select: string,
  ambiente: AmbienteEquipe | null,
) {
  const linhas: unknown[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    let consulta = supabase.from("demandas").select(select).or(SEM_CONCLUIDAS);
    if (ambiente) consulta = consulta.eq("ambiente", ambiente);
    const { data, error } = await consulta
      .order("peso", { ascending: false })
      .order("criado_em", { ascending: true })
      .order("id", { ascending: true })
      .range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) return { data: null, error };
    linhas.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) return { data: linhas, error: null };
  }
}

/** Quadro sem as concluídas (essas vêm por listarConcluidas). */
export async function listarQuadro(
  supabase: Cliente,
  ambiente: AmbienteEquipe,
): Promise<DemandaKanban[]> {
  const ordenar = (select: string) => todasAsPaginas(supabase, select, ambiente);

  let filtrado = await ordenar(`${SELECT_SISTEMA}, ambiente, ${CAMPOS_ALERTA}`);
  if (filtrado.error && faltaAlerta(filtrado.error.message)) {
    filtrado = await ordenar(`${SELECT_SISTEMA}, ambiente`);
  }

  if (!filtrado.error) {
    return (filtrado.data ?? []) as unknown as DemandaKanban[];
  }

  const selectSemSistema = faltaSistema(filtrado.error.message)
    ? `${DEMANDA_SELECT}, ambiente`
    : `${SELECT_SISTEMA}, ambiente`;

  const semSistema = await ordenar(selectSemSistema);

  if (!semSistema.error) {
    return (semSistema.data ?? []) as unknown as DemandaKanban[];
  }

  const tudo = await todasAsPaginas(supabase, DEMANDA_SELECT, null);

  return (tudo.data ?? []) as unknown as DemandaKanban[];
}

export type PeriodoConcluidas = "hoje" | "7dias" | "30dias" | "tudo";

export const PERIODO_CONCLUIDAS_LABEL: Record<PeriodoConcluidas, string> = {
  hoje: "Hoje",
  "7dias": "7 dias",
  "30dias": "30 dias",
  tudo: "Tudo",
};

/** Início do período no horário de quem está vendo. Tudo: sem limite. */
export function inicioPeriodo(
  periodo: PeriodoConcluidas,
  agora: Date,
): string | null {
  if (periodo === "tudo") return null;
  const dias = periodo === "hoje" ? 0 : periodo === "7dias" ? 6 : 29;
  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - dias);
  return inicio.toISOString();
}

/** Tira o que quebra o filtro do Supabase (vírgula, parênteses, curingas). */
export function termoBuscaSeguro(texto: string) {
  return texto.replace(/[,()%*\\]/g, " ").trim();
}

export type FiltroConcluidas = {
  periodo: PeriodoConcluidas;
  pagina: number;
  maisAntigasPrimeiro: boolean;
  busca?: string;
  /** Só no quadro do gestor: Chamados (sem projeto) ou Projetos. */
  visao?: "fila" | "projetos";
  projetoId?: string;
  colaboradorId?: string;
  prioridade?: Enums<"demanda_prioridade">;
  sistemaId?: string;
};

/** Uma página da coluna Concluídas, já filtrada no banco. */
export async function listarConcluidas(
  supabase: Cliente,
  ambiente: AmbienteEquipe,
  filtro: FiltroConcluidas,
  agora = new Date(),
): Promise<{ itens: DemandaKanban[]; total: number; pagina: number }> {
  const desde = inicioPeriodo(filtro.periodo, agora);
  const termo = termoBuscaSeguro(filtro.busca ?? "");

  const buscar = (select: string, pagina: number, soContar = false) => {
    const inicio = pagina * CONCLUIDAS_POR_PAGINA;
    let consulta = supabase
      .from("demandas")
      .select(select, { count: "exact", head: soContar })
      .eq("ambiente", ambiente)
      .eq("status", "concluida")
      .eq("arquivado", false);
    if (desde) consulta = consulta.gte("concluido_em", desde);
    if (termo) {
      consulta = consulta.or(
        `titulo.ilike.%${termo}%,sublocal.ilike.%${termo}%,descricao.ilike.%${termo}%`,
      );
    }
    if (filtro.visao === "fila") consulta = consulta.is("projeto_id", null);
    if (filtro.visao === "projetos") {
      consulta = filtro.projetoId
        ? consulta.eq("projeto_id", filtro.projetoId)
        : consulta.not("projeto_id", "is", null);
    }
    if (filtro.colaboradorId) {
      consulta = consulta.eq("colaborador_id", filtro.colaboradorId);
    }
    if (filtro.prioridade) consulta = consulta.eq("prioridade", filtro.prioridade);
    if (filtro.sistemaId) consulta = consulta.eq("sistema_id", filtro.sistemaId);
    return consulta
      .order("concluido_em", { ascending: filtro.maisAntigasPrimeiro })
      .order("id", { ascending: true })
      .range(inicio, inicio + CONCLUIDAS_POR_PAGINA - 1);
  };

  let pagina = filtro.pagina;
  // Página que deixou de existir (cards saíram do período): vai para a última.
  if (pagina > 0) {
    const { count } = await buscar("id", 0, true);
    const ultima = Math.max(0, Math.ceil((count ?? 0) / CONCLUIDAS_POR_PAGINA) - 1);
    pagina = Math.min(pagina, ultima);
  }

  let res = await buscar(`${SELECT_SISTEMA}, ambiente, ${CAMPOS_ALERTA}`, pagina);
  if (res.error) res = await buscar(`${DEMANDA_SELECT}, ambiente`, pagina);
  if (res.error) return { itens: [], total: 0, pagina: 0 };

  return {
    itens: (res.data ?? []) as unknown as DemandaKanban[],
    total: res.count ?? 0,
    pagina,
  };
}
