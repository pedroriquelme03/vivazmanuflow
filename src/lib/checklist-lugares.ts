/**
 * Árvore de locais do checklist (documento "Classificação de Áreas"):
 *
 *   Unidade (propriedade) → Categoria → Tipo de espaço → Classificação → Local específico
 *
 * Categoria, tipo e classificação ficam em gov_lugares; o local específico é a linha de
 * gov_acomodacoes, ligada a um tipo ou classificação (lugar_id). A classificação é
 * opcional (um depósito vai direto do tipo para o local). Quem cuida do local (setor) é
 * etiqueta, fora da árvore. Um checklist liga a pontos da árvore e vale para tudo abaixo.
 */
import type { Tables } from "./database.types";
import { localServeAoChecklist, rotuloAplicacao } from "./governanca";

export type Lugar = Tables<"gov_lugares">;
export type NivelLugar = "categoria" | "tipo" | "classificacao";
export type LugarRef = Pick<Lugar, "id" | "parent_id" | "nivel" | "nome" | "propriedade_id" | "ordem" | "ativo">;

export const NIVEIS_LUGAR: { valor: NivelLugar; rotulo: string; plural: string }[] = [
  { valor: "categoria", rotulo: "Categoria", plural: "Categorias" },
  { valor: "tipo", rotulo: "Tipo de espaço", plural: "Tipos de espaço" },
  { valor: "classificacao", rotulo: "Classificação", plural: "Classificações" },
];

export function rotuloNivel(nivel: string) {
  return NIVEIS_LUGAR.find((n) => n.valor === nivel)?.rotulo ?? nivel;
}

/** O nível que fica dentro deste (categoria → tipo → classificação → nenhum). */
export function nivelFilho(nivel: string | null): NivelLugar | null {
  if (nivel === null) return "categoria";
  if (nivel === "categoria") return "tipo";
  if (nivel === "tipo") return "classificacao";
  return null;
}

const porOrdem = (a: LugarRef, b: LugarRef) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR");

/** Filhos de um ponto (ou as categorias da unidade, com pai null), na ordem certa. */
export function filhos<L extends LugarRef>(
  lugares: readonly L[],
  paiId: string | null,
  propriedadeId?: string | null,
  soAtivos = true,
): L[] {
  return lugares
    .filter(
      (l) =>
        l.parent_id === paiId &&
        (paiId !== null || !propriedadeId || l.propriedade_id === propriedadeId) &&
        (!soAtivos || l.ativo),
    )
    .sort(porOrdem);
}

/** Do mais amplo (categoria) até o próprio ponto. */
export function ancestrais<L extends LugarRef>(lugares: readonly L[], id: string | null | undefined): L[] {
  const porId = new Map(lugares.map((l) => [l.id, l]));
  const cadeia: L[] = [];
  let atual = id ? porId.get(id) : undefined;
  const vistos = new Set<string>();
  while (atual && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    cadeia.unshift(atual);
    atual = atual.parent_id ? porId.get(atual.parent_id) : undefined;
  }
  return cadeia;
}

/** "Hospedagem › UH Apartamento › Garden". */
export function caminhoLugar(lugares: readonly LugarRef[], id: string | null | undefined) {
  return ancestrais(lugares, id)
    .map((l) => l.nome)
    .join(" › ");
}

/** A categoria de um ponto (o primeiro da cadeia). */
export function categoriaDe<L extends LugarRef>(lugares: readonly L[], id: string | null | undefined): L | null {
  return ancestrais(lugares, id)[0] ?? null;
}

/** O ponto e tudo que está abaixo dele. */
export function descendentes(lugares: readonly LugarRef[], id: string): Set<string> {
  const todos = new Set([id]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const l of lugares) {
      if (l.parent_id && todos.has(l.parent_id) && !todos.has(l.id)) {
        todos.add(l.id);
        mudou = true;
      }
    }
  }
  return todos;
}

/** O ponto `id` está dentro de `alvo` (ou é ele)? */
export function dentroDe(lugares: readonly LugarRef[], id: string | null | undefined, alvo: string) {
  return ancestrais(lugares, id).some((l) => l.id === alvo);
}

type LocalRef = { lugar_id: string | null; tipo: string; propriedade_id: string };

/**
 * O checklist oferece este local? Ligado à árvore: o local precisa estar debaixo de
 * algum ponto ligado. Sem ligação: a regra antiga (UH do tipo do checklist ou área).
 */
export function localNoChecklist(
  local: LocalRef,
  processo: { tipo: string },
  ligados: readonly string[],
  lugares: readonly LugarRef[],
) {
  if (ligados.length === 0) return localServeAoChecklist(local, processo);
  return ligados.some((alvo) => dentroDe(lugares, local.lugar_id, alvo));
}

export type GrupoLocal = "eletronico" | "mobilia" | "equipamento";

/** O que a ficha do local mostra: dados da UH e os grupos de itens, conforme a categoria. */
export function fichaDoLocal(lugares: readonly Lugar[], lugarId: string | null | undefined) {
  const categoria = categoriaDe(lugares, lugarId);
  if (!categoria) return { fichaUh: false, grupos: [] as GrupoLocal[] };
  return {
    fichaUh: categoria.ficha_uh,
    grupos: categoria.grupos.filter((g): g is GrupoLocal => ["eletronico", "mobilia", "equipamento"].includes(g)),
  };
}

/** A UH herda suíte/apartamento do tipo dela; o resto é "área" (só para o legado). */
export function tipoLegadoDoLocal(lugares: readonly Lugar[], lugarId: string | null | undefined) {
  const tipo = ancestrais(lugares, lugarId).find((l) => l.nivel === "tipo");
  return tipo?.tipo_uh === "suite" || tipo?.tipo_uh === "apartamento" ? tipo.tipo_uh : "area";
}

/** Escolha em cascata: os ids escolhidos em cada nível ("" = todos). */
export type FiltroLugar = { categoria: string; tipo: string; classificacao: string };
export const FILTRO_LUGAR_VAZIO: FiltroLugar = { categoria: "", tipo: "", classificacao: "" };

/** O ponto mais específico escolhido na cascata (ou null = todos). */
export function alvoDoFiltro(f: FiltroLugar) {
  return f.classificacao || f.tipo || f.categoria || null;
}

/** Mudou um nível: os de baixo voltam para "todos". */
export function mudarFiltroLugar(f: FiltroLugar, nivel: NivelLugar, valor: string): FiltroLugar {
  if (nivel === "categoria") return { categoria: valor, tipo: "", classificacao: "" };
  if (nivel === "tipo") return { ...f, tipo: valor, classificacao: "" };
  return { ...f, classificacao: valor };
}

/** Monta a cascata a partir de um ponto (ex.: para abrir o filtro já marcado). */
export function filtroDoLugar(lugares: readonly LugarRef[], id: string | null | undefined): FiltroLugar {
  const f = { ...FILTRO_LUGAR_VAZIO };
  for (const l of ancestrais(lugares, id)) {
    if (l.nivel === "categoria" || l.nivel === "tipo" || l.nivel === "classificacao") f[l.nivel] = l.id;
  }
  return f;
}

/**
 * Um registro (local ou inspeção) está no ponto filtrado? Pelo local; sem local, pelos
 * pontos a que o checklist está ligado (que estejam dentro do filtro).
 */
export function noLugarFiltrado(
  lugares: readonly LugarRef[],
  alvo: string | null,
  lugarDoLocal: string | null | undefined,
  ligadosDoChecklist: readonly string[] = [],
) {
  if (!alvo) return true;
  if (lugarDoLocal) return dentroDe(lugares, lugarDoLocal, alvo);
  return ligadosDoChecklist.some((l) => dentroDe(lugares, l, alvo));
}

/**
 * Filtro por caminho de nomes (ex.: ["Operacional", "Casas de Máquinas"]), para filtrar
 * as duas unidades de uma vez: "Sanitários" pega os banheiros do hotel e do parque.
 * Vazio = tudo. A unidade é filtrada à parte.
 */
export type CaminhoFiltro = string[];

const mesmo = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0;

/** Nomes que dá para escolher no próximo nível, debaixo do caminho já escolhido. */
export function opcoesDoCaminho(
  lugares: readonly LugarRef[],
  unidadeId: string | null,
  caminho: CaminhoFiltro,
): string[] {
  const nivel = nivelFilho(caminho.length === 0 ? null : (["categoria", "tipo", "classificacao"][caminho.length - 1] ?? "x"));
  if (!nivel) return [];
  const nomes = new Map<string, string>();
  for (const l of lugares) {
    if (!l.ativo || l.nivel !== nivel || (unidadeId && l.propriedade_id !== unidadeId)) continue;
    const pais = ancestrais(lugares, l.id).slice(0, -1).map((p) => p.nome);
    if (pais.length === caminho.length && pais.every((n, i) => mesmo(n, caminho[i]))) {
      const chave = l.nome.toLocaleLowerCase("pt-BR");
      if (!nomes.has(chave)) nomes.set(chave, l.nome);
    }
  }
  return [...nomes.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** O ponto está dentro do caminho filtrado (pelos nomes, em qualquer unidade)? */
export function noCaminho(lugares: readonly LugarRef[], lugarId: string | null | undefined, caminho: CaminhoFiltro) {
  if (caminho.length === 0) return true;
  const nomes = ancestrais(lugares, lugarId).map((l) => l.nome);
  return caminho.length <= nomes.length && caminho.every((n, i) => mesmo(n, nomes[i]));
}

/** Registro (local ou inspeção) no caminho: pelo local; sem local, pelos pontos do checklist. */
export function registroNoCaminho(
  lugares: readonly LugarRef[],
  caminho: CaminhoFiltro,
  lugarDoLocal: string | null | undefined,
  ligadosDoChecklist: readonly string[] = [],
) {
  if (caminho.length === 0) return true;
  if (lugarDoLocal) return noCaminho(lugares, lugarDoLocal, caminho);
  return ligadosDoChecklist.some((l) => noCaminho(lugares, l, caminho));
}

/** "Operacional › Casas de Máquinas" ⇄ ["Operacional", "Casas de Máquinas"] (para a URL). */
export function caminhoParaTexto(caminho: CaminhoFiltro) {
  return caminho.join(" › ");
}
export function textoParaCaminho(texto: string | null | undefined): CaminhoFiltro {
  return (texto ?? "")
    .split("›")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Onde o checklist se aplica, para as listas: os pontos ligados (e se pede o local
 * específico); sem ligação, o texto antigo (Suítes, Apartamentos, Áreas, Sem local).
 */
export function rotuloOndeChecklist(
  p: { usa_acomodacao: boolean; tipo: string },
  ligados: readonly string[],
  lugares: readonly LugarRef[],
) {
  if (ligados.length === 0) return rotuloAplicacao(p);
  const onde = ligados.map((id) => caminhoLugar(lugares, id)).filter(Boolean).join(", ");
  return p.usa_acomodacao ? `${onde} (escolhe o local)` : onde;
}

/** Os pontos ligados a um checklist, em texto curto: "Hospedagem › UH Suíte, Lazer › Piscinas". */
export function rotuloOndeAplica(lugares: readonly LugarRef[], ligados: readonly string[]) {
  return ligados
    .map((id) => caminhoLugar(lugares, id))
    .filter(Boolean)
    .join(", ");
}
