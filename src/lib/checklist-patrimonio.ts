/**
 * Patrimônio dos locais do checklist: itens de cada UH ou área (TV, ar, cofre...)
 * com marca e modelo, e a conferência feita na hora de responder a pergunta.
 */
import type { Tables } from "@/lib/database.types";

export type TipoItemPatrimonio = Tables<"gov_tipos_item">;
export type ItemLocal = Tables<"gov_local_itens">;

/** Cada tipo é de um grupo, e cada grupo tem a sua seção na tela do local. */
export type GrupoItem = "eletronico" | "mobilia" | "equipamento";
export const GRUPOS_ITEM: { valor: GrupoItem; rotulo: string; exemplos: string; novoTipo: string }[] = [
  { valor: "eletronico", rotulo: "Eletrônicos", exemplos: "TV, ar-condicionado, frigobar, cofre…", novoTipo: "Ex.: Secador de cabelo" },
  { valor: "mobilia", rotulo: "Mobília", exemplos: "Cama, armário, banheira de hidromassagem…", novoTipo: "Ex.: Cama box" },
  { valor: "equipamento", rotulo: "Equipamentos", exemplos: "Bomba, filtro, quadro elétrico, gerador…", novoTipo: "Ex.: Aquecedor" },
];

/** Tipo sem grupo (ou com valor estranho) conta como eletrônico, que era o único antes. */
export function grupoDoTipo(tipo: { grupo?: string | null } | undefined): GrupoItem {
  return tipo?.grupo === "mobilia" || tipo?.grupo === "equipamento" ? tipo.grupo : "eletronico";
}

export function rotuloGrupoItem(grupo: string | null | undefined) {
  return GRUPOS_ITEM.find((g) => g.valor === grupoDoTipo({ grupo }))!.rotulo;
}

/** Tipos ativos do grupo, mais o tipo atual do item (mesmo inativo) para não sumir do select. */
export function tiposDoGrupo<T extends { id: string; ativo: boolean; grupo?: string | null }>(
  tipos: readonly T[],
  grupo: GrupoItem,
  atual?: string,
) {
  return tipos.filter((t) => t.id === atual || (t.ativo && grupoDoTipo(t) === grupo));
}

/** Itens do local que são do grupo, pelo tipo de cada um. */
export function itensDoGrupo<I extends { tipo_item_id: string }>(
  itens: readonly I[],
  tipos: readonly { id: string; grupo?: string | null }[],
  grupo: GrupoItem,
) {
  const grupoPorTipo = new Map(tipos.map((t) => [t.id, grupoDoTipo(t)]));
  return itens.filter((i) => (grupoPorTipo.get(i.tipo_item_id) ?? "eletronico") === grupo);
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
