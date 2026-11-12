/**
 * Organização do Checklist: Propriedade → Setor → (checklists, colaboradores).
 * Os colaboradores ficam na tabela gov_camareiras e os locais em gov_acomodacoes
 * (nomes antigos mantidos para não quebrar o que já existe).
 */
import type { Tables } from "@/lib/database.types";
import { normalizarBusca, type GovPapel } from "@/lib/governanca";

export type SetorChecklist = Tables<"gov_setores">;
export type Colaborador = Tables<"gov_camareiras">;
export type PropriedadeRef = Pick<Tables<"propriedades">, "id" | "nome" | "ativo">;

export const SEM_SETOR = "Sem setor";

const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR");

export const jaExisteSetor = (nome: string) => `Já existe o setor "${nome}" nessa propriedade.`;

/** Tira espaços sobrando: "  Casa   de máquinas " → "Casa de máquinas". */
export function limparNome(nome: string) {
  return nome.trim().replace(/\s+/g, " ");
}

/**
 * Já existe outro item com esse nome? Ignora maiúsculas, acentos e espaços.
 * `idAtual` é o próprio item quando ele está sendo renomeado.
 */
export function nomeRepetido(
  nome: string,
  existentes: readonly { id: string; nome: string }[],
  idAtual?: string,
) {
  const chave = normalizarBusca(limparNome(nome));
  return existentes.some((e) => e.id !== idAtual && normalizarBusca(limparNome(e.nome)) === chave);
}

/** "Vivaz Cataratas · Governança". Setor desconhecido vira "Sem setor". */
export function rotuloSetor(
  setorId: string | null | undefined,
  setores: readonly SetorChecklist[],
  propriedades: readonly PropriedadeRef[],
) {
  const setor = setores.find((s) => s.id === setorId);
  if (!setor) return SEM_SETOR;
  const propriedade = propriedades.find((p) => p.id === setor.propriedade_id);
  return propriedade ? `${propriedade.nome} · ${setor.nome}` : setor.nome;
}

/** Itens cujo nome ou setor ("Vivaz · Governança") contém a busca, sem olhar acento e maiúscula. */
export function buscarPorSetor<T extends { setor_id: string | null; nome: string }>(
  itens: readonly T[],
  busca: string,
  setores: readonly SetorChecklist[],
  propriedades: readonly PropriedadeRef[],
) {
  const q = normalizarBusca(busca);
  if (!q) return [...itens];
  const rotulos = new Map(setores.map((s) => [s.id, rotuloSetor(s.id, setores, propriedades)]));
  return itens.filter((i) => normalizarBusca(`${rotulos.get(i.setor_id ?? "") ?? ""} ${i.nome}`).includes(q));
}

/**
 * Propriedades em ordem alfabética, cada uma com seus setores (também em ordem).
 * Sem `incluirVazias`, propriedade sem setor fica de fora.
 */
export function setoresPorPropriedade<S extends SetorChecklist, P extends PropriedadeRef>(
  setores: readonly S[],
  propriedades: readonly P[],
  incluirVazias = false,
) {
  return [...propriedades]
    .sort(porNome)
    .map((propriedade) => ({
      propriedade,
      setores: setores.filter((s) => s.propriedade_id === propriedade.id).sort(porNome),
    }))
    .filter((g) => incluirVazias || g.setores.length > 0);
}

/** A pessoa cuida deste setor: admin sempre; líder, se o setor é dele. Aplicador não. */
export function cuidaDoSetor(
  papel: GovPapel | null,
  setorId: string | null | undefined,
  meusSetores: readonly { id: string }[],
) {
  if (papel === "admin") return true;
  return papel === "lider" && meusSetores.some((s) => s.id === setorId);
}

/** Setores que a pessoa usa: o admin, todos; os demais, só os liberados para ela. */
export function setoresDaPessoa(
  papel: GovPapel | null,
  setores: readonly SetorChecklist[],
  liberados: readonly string[],
) {
  if (!papel) return [];
  const lista = papel === "admin" ? setores : setores.filter((s) => liberados.includes(s.id));
  return [...lista].sort(porNome);
}

export type GrupoSetor<T> = { setor: SetorChecklist | null; itens: T[] };
export type GrupoPropriedade<T> = { propriedade: PropriedadeRef | null; setores: GrupoSetor<T>[] };

/** Chave de um grupo de propriedade ou de setor ("Sem setor" quando não tem). */
export const chaveGrupo = (g: { id: string } | null) => g?.id ?? SEM_SETOR;

/**
 * Em que passo da escolha Propriedade → Setor → Checklist a pessoa está.
 * Quando só existe uma propriedade (ou um setor), o passo é pulado sozinho.
 */
export function passoEscolha<T>(
  grupos: readonly GrupoPropriedade<T>[],
  propriedadeId: string | null,
  setorId: string | null,
) {
  const grupo = grupos.length === 1 ? grupos[0] : grupos.find((g) => chaveGrupo(g.propriedade) === propriedadeId);
  if (!grupo) return { etapa: "propriedade" as const };
  const setor =
    grupo.setores.length === 1 ? grupo.setores[0] : grupo.setores.find((s) => chaveGrupo(s.setor) === setorId);
  if (!setor) return { etapa: "setor" as const, grupo };
  return { etapa: "checklist" as const, grupo, setor };
}

/**
 * Agrupa por propriedade e, dentro dela, por setor, em ordem alfabética.
 * Itens com setor fora das listas recebidas vão para um grupo "Sem setor" no
 * fim. Grupos vazios não aparecem.
 */
export function agruparPorSetor<T extends { setor_id: string | null; nome: string }>(
  itens: readonly T[],
  setores: readonly SetorChecklist[],
  propriedades: readonly PropriedadeRef[],
): GrupoPropriedade<T>[] {
  const arvore = setoresPorPropriedade(setores, propriedades);
  const porSetor = new Map<string, T[]>(arvore.flatMap((g) => g.setores.map((s) => [s.id, [] as T[]])));
  const semSetor: T[] = [];
  for (const item of itens) {
    (porSetor.get(item.setor_id ?? "") ?? semSetor).push(item);
  }

  const grupos: GrupoPropriedade<T>[] = arvore
    .map((g) => ({
      propriedade: g.propriedade,
      setores: g.setores
        .map((setor) => ({ setor, itens: (porSetor.get(setor.id) ?? []).sort(porNome) }))
        .filter((s) => s.itens.length > 0),
    }))
    .filter((g) => g.setores.length > 0);

  if (semSetor.length) {
    grupos.push({ propriedade: null, setores: [{ setor: null, itens: semSetor.sort(porNome) }] });
  }
  return grupos;
}
