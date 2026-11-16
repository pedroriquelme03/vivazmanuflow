/**
 * Patrimônio dos locais do checklist: itens de cada UH ou área (TV, ar, cofre...)
 * com marca e modelo, e a conferência feita na hora de responder a pergunta.
 */
import type { Tables } from "@/lib/database.types";

export type TipoItemPatrimonio = Tables<"gov_tipos_item">;
export type ItemLocal = Tables<"gov_local_itens">;

/**
 * Grupos de itens (Eletrônicos, Mobília, Equipamentos... e os que o admin criar).
 * Cada tipo de item é de um grupo; cada grupo vira uma seção na ficha do local.
 */
export type GrupoItem = { codigo: string; nome: string; exemplos: string | null; ordem: number; ativo: boolean };

/** Os grupos de antes do cadastro de grupos (enquanto o SQL não roda). */
export const GRUPOS_PADRAO: GrupoItem[] = [
  { codigo: "eletronico", nome: "Eletrônicos", exemplos: "TV, ar-condicionado, frigobar, cofre…", ordem: 1, ativo: true },
  { codigo: "mobilia", nome: "Mobília", exemplos: "Cama, armário, banheira de hidromassagem…", ordem: 2, ativo: true },
  { codigo: "equipamento", nome: "Equipamentos", exemplos: "Bomba, filtro, quadro elétrico, gerador…", ordem: 3, ativo: true },
];

/** O grupo do tipo; sem grupo conhecido, eletrônicos (que era o único antes). */
export function grupoDoTipo(
  tipo: { grupo?: string | null } | undefined,
  grupos: readonly { codigo: string }[] = GRUPOS_PADRAO,
): string {
  const g = tipo?.grupo;
  if (g && grupos.some((x) => x.codigo === g)) return g;
  return grupos.some((x) => x.codigo === "eletronico") ? "eletronico" : (grupos[0]?.codigo ?? "eletronico");
}

export function nomeDoGrupo(codigo: string | null | undefined, grupos: readonly GrupoItem[] = GRUPOS_PADRAO) {
  return grupos.find((g) => g.codigo === grupoDoTipo({ grupo: codigo }, grupos))?.nome ?? "Itens";
}

/** Tipos ativos do grupo, mais o tipo atual do item (mesmo inativo) para não sumir do select. */
export function tiposDoGrupo<T extends { id: string; ativo: boolean; grupo?: string | null }>(
  tipos: readonly T[],
  grupo: string,
  atual?: string,
  grupos: readonly { codigo: string }[] = GRUPOS_PADRAO,
) {
  return tipos.filter((t) => t.id === atual || (t.ativo && grupoDoTipo(t, grupos) === grupo));
}

/** Itens do local que são do grupo, pelo tipo de cada um. */
export function itensDoGrupo<I extends { tipo_item_id: string }>(
  itens: readonly I[],
  tipos: readonly { id: string; grupo?: string | null }[],
  grupo: string,
  grupos: readonly { codigo: string }[] = GRUPOS_PADRAO,
) {
  const grupoPorTipo = new Map(tipos.map((t) => [t.id, grupoDoTipo(t, grupos)]));
  return itens.filter((i) => (grupoPorTipo.get(i.tipo_item_id) ?? grupoDoTipo(undefined, grupos)) === grupo);
}

/** Código fixo de um grupo novo a partir do nome ("Máquinas" → "maquinas"), sem repetir. */
export function codigoDoGrupo(nome: string, existentes: readonly string[]) {
  const base =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "grupo";
  let codigo = base;
  for (let n = 2; existentes.includes(codigo); n++) codigo = `${base}_${n}`;
  return codigo;
}

/** "SAMSUNG 50'" (marca e modelo); sem nenhum dos dois, o nome do tipo. */
export function descreverItem(item: { marca: string | null; modelo: string | null }, tipo?: string) {
  const texto = [item.marca, item.modelo].map((p) => p?.trim()).filter(Boolean).join(" ");
  return texto || tipo || "Sem marca";
}

/** Itens do local que são do tipo da pergunta, já descritos ("SAMSUNG 12000 · LG 12000"). */
export function previstoNoLocal(itens: readonly ItemLocal[], localId: string | null | undefined, tipoId: string | null) {
  if (!localId || !tipoId) return null;
  const doTipo = itens.filter((i) => i.local_id === localId && i.tipo_item_id === tipoId);
  return doTipo.length ? doTipo.map((i) => descreverItem(i)).join(" · ") : null;
}

/** Contagem de itens por local, para os cartões da lista de Locais. */
export function contarItensPorLocal(itens: readonly { local_id: string }[]) {
  const contagem: Record<string, number> = {};
  for (const { local_id } of itens) contagem[local_id] = (contagem[local_id] ?? 0) + 1;
  return contagem;
}

type RespostaComItem = {
  resposta: string | null;
  item_previsto: string | null;
  item_diferente: boolean;
};

/**
 * Resumo por modelo cadastrado: quantas vezes foi conferido, quantos "Não" e
 * quantas vezes encontraram outro modelo. Mais problemas primeiro.
 */
export function resumoPorModelo(respostas: readonly RespostaComItem[]) {
  const mapa = new Map<string, { modelo: string; conferidos: number; nao: number; diferentes: number }>();
  for (const r of respostas) {
    if (!r.item_previsto) continue;
    const linha = mapa.get(r.item_previsto) ?? { modelo: r.item_previsto, conferidos: 0, nao: 0, diferentes: 0 };
    linha.conferidos += 1;
    if (r.resposta === "nao") linha.nao += 1;
    if (r.item_diferente) linha.diferentes += 1;
    mapa.set(r.item_previsto, linha);
  }
  return [...mapa.values()].sort((a, b) => b.nao + b.diferentes - (a.nao + a.diferentes) || b.conferidos - a.conferidos);
}
