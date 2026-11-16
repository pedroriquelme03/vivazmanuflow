import { describe, expect, it } from "vitest";
import {
  contarItensPorLocal,
  descreverItem,
  grupoDoTipo,
  itensDoGrupo,
  previstoNoLocal,
  resumoPorModelo,
  codigoDoGrupo,
  nomeDoGrupo,
  tiposDoGrupo,
  type ItemLocal,
} from "./checklist-patrimonio";

const item = (over: Partial<ItemLocal>): ItemLocal => ({
  id: "i",
  local_id: "uh-1000",
  tipo_item_id: "tv",
  marca: "SAMSUNG",
  modelo: "50'",
  patrimonio: null,
  criado_em: "2026-11-12T00:00:00Z",
  ...over,
});

describe("grupos de item", () => {
  const tipos = [
    { id: "tv", nome: "TV", grupo: "eletronico", ativo: true },
    { id: "banheira", nome: "Banheira de hidromassagem", grupo: "mobilia", ativo: true },
    { id: "cama", nome: "Cama", grupo: "mobilia", ativo: false },
  ];

  it("sem grupo conta como eletrônico", () => {
    expect(grupoDoTipo({ grupo: "mobilia" })).toBe("mobilia");
    expect(grupoDoTipo({ grupo: null })).toBe("eletronico");
    expect(grupoDoTipo(undefined)).toBe("eletronico");
    expect(nomeDoGrupo("mobilia")).toBe("Mobília");
    expect(nomeDoGrupo("x")).toBe("Eletrônicos");
    const maquinas = [{ codigo: "maquinas", nome: "Máquinas", exemplos: null, ordem: 1, ativo: true }];
    expect(grupoDoTipo({ grupo: "maquinas" }, maquinas)).toBe("maquinas");
    expect(grupoDoTipo({ grupo: "x" }, maquinas)).toBe("maquinas");
    expect(codigoDoGrupo("Máquinas e Bombas!", [])).toBe("maquinas_e_bombas");
    expect(codigoDoGrupo("Mobília", ["mobilia"])).toBe("mobilia_2");
  });

  it("tipos ativos do grupo, mantendo o atual do item", () => {
    expect(tiposDoGrupo(tipos, "mobilia").map((t) => t.id)).toEqual(["banheira"]);
    expect(tiposDoGrupo(tipos, "mobilia", "cama").map((t) => t.id)).toEqual(["banheira", "cama"]);
    expect(tiposDoGrupo(tipos, "eletronico").map((t) => t.id)).toEqual(["tv"]);
  });

  it("separa os itens do local por grupo; tipo desconhecido fica em eletrônicos", () => {
    const itens = [item({ id: "1" }), item({ id: "2", tipo_item_id: "banheira" }), item({ id: "3", tipo_item_id: "?" })];
    expect(itensDoGrupo(itens, tipos, "eletronico").map((i) => i.id)).toEqual(["1", "3"]);
    expect(itensDoGrupo(itens, tipos, "mobilia").map((i) => i.id)).toEqual(["2"]);
  });
});

describe("descreverItem", () => {
  it("junta marca e modelo", () => {
    expect(descreverItem({ marca: "SAMSUNG", modelo: "50'" })).toBe("SAMSUNG 50'");
    expect(descreverItem({ marca: "KABA", modelo: null })).toBe("KABA");
  });

  it("sem marca nem modelo usa o tipo", () => {
    expect(descreverItem({ marca: null, modelo: " " }, "Alexa")).toBe("Alexa");
  });
});

describe("previstoNoLocal", () => {
  const itens = [
    item({ id: "1" }),
    item({ id: "2", tipo_item_id: "ar", marca: "SAMSUNG", modelo: "12000" }),
    item({ id: "3", tipo_item_id: "ar", marca: "LG", modelo: "12000" }),
    item({ id: "4", local_id: "uh-1001", marca: "LG", modelo: "32'" }),
  ];

  it("mostra os itens do tipo da pergunta naquele local", () => {
    expect(previstoNoLocal(itens, "uh-1000", "tv")).toBe("SAMSUNG 50'");
    expect(previstoNoLocal(itens, "uh-1000", "ar")).toBe("SAMSUNG 12000 · LG 12000");
  });

  it("sem local, sem tipo ou sem item devolve null", () => {
    expect(previstoNoLocal(itens, null, "tv")).toBeNull();
    expect(previstoNoLocal(itens, "uh-1000", null)).toBeNull();
    expect(previstoNoLocal(itens, "uh-1000", "cofre")).toBeNull();
  });
});

it("conta itens por local", () => {
  expect(contarItensPorLocal([{ local_id: "a" }, { local_id: "a" }, { local_id: "b" }])).toEqual({ a: 2, b: 1 });
});

describe("resumoPorModelo", () => {
  it("conta conferências, Não e modelo diferente, com mais problemas primeiro", () => {
    const r = resumoPorModelo([
      { resposta: "sim", item_previsto: "LG 32'", item_diferente: false },
      { resposta: "nao", item_previsto: "SEMP 43'", item_diferente: false },
      { resposta: "sim", item_previsto: "SEMP 43'", item_diferente: true },
      { resposta: "nao", item_previsto: null, item_diferente: false },
    ]);
    expect(r).toEqual([
      { modelo: "SEMP 43'", conferidos: 2, nao: 1, diferentes: 1 },
      { modelo: "LG 32'", conferidos: 1, nao: 0, diferentes: 0 },
    ]);
  });
});
