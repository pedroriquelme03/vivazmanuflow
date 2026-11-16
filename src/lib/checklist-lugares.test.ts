import { describe, expect, it } from "vitest";
import {
  alvoDoFiltro,
  ancestrais,
  caminhoLugar,
  descendentes,
  dentroDe,
  fichaDoLocal,
  filhos,
  filtroDoLugar,
  localNoChecklist,
  caminhoParaTexto,
  mudarFiltroLugar,
  nivelFilho,
  noCaminho,
  noLugarFiltrado,
  opcoesDoCaminho,
  registroNoCaminho,
  textoParaCaminho,
  rotuloOndeAplica,
  tipoLegadoDoLocal,
  type Lugar,
} from "./checklist-lugares";

const lugar = (id: string, parent_id: string | null, nivel: string, nome: string, over: Partial<Lugar> = {}): Lugar => ({
  id,
  parent_id,
  nivel,
  nome,
  propriedade_id: "vivaz",
  ordem: 0,
  ativo: true,
  ficha_uh: false,
  grupos: [],
  tipo_uh: null,
  criado_em: "",
  ...over,
});

const arvore = [
  lugar("hosp", null, "categoria", "Hospedagem", { ficha_uh: true, grupos: ["eletronico", "mobilia"], ordem: 1 }),
  lugar("apto", "hosp", "tipo", "UH Apartamento", { tipo_uh: "apartamento" }),
  lugar("suite", "hosp", "tipo", "UH Suíte", { tipo_uh: "suite" }),
  lugar("garden", "apto", "classificacao", "Garden"),
  lugar("oper", null, "categoria", "Operacional", { grupos: ["equipamento"], ordem: 2 }),
  lugar("cm", "oper", "tipo", "Casa de Máquinas"),
  lugar("aq-oper", null, "categoria", "Operacional", { propriedade_id: "aqua" }),
  lugar("velho", null, "categoria", "Desativada", { ativo: false }),
];

describe("navegar na árvore", () => {
  it("filhos na ordem, só da unidade e ativos", () => {
    expect(filhos(arvore, null, "vivaz").map((l) => l.id)).toEqual(["hosp", "oper"]);
    expect(filhos(arvore, "hosp").map((l) => l.id)).toEqual(["apto", "suite"]);
    expect(filhos(arvore, null, "vivaz", false).map((l) => l.id)).toContain("velho");
  });

  it("caminho, ancestrais e descendentes", () => {
    expect(caminhoLugar(arvore, "garden")).toBe("Hospedagem › UH Apartamento › Garden");
    expect(ancestrais(arvore, "cm").map((l) => l.id)).toEqual(["oper", "cm"]);
    expect([...descendentes(arvore, "hosp")].sort()).toEqual(["apto", "garden", "hosp", "suite"]);
    expect(dentroDe(arvore, "garden", "hosp")).toBe(true);
    expect(dentroDe(arvore, "cm", "hosp")).toBe(false);
  });

  it("nível de dentro", () => {
    expect(nivelFilho(null)).toBe("categoria");
    expect(nivelFilho("tipo")).toBe("classificacao");
    expect(nivelFilho("classificacao")).toBeNull();
  });
});

describe("local e checklist", () => {
  const uhGarden = { lugar_id: "garden", tipo: "apartamento", propriedade_id: "vivaz" };
  const casaMaquinas = { lugar_id: "cm", tipo: "area", propriedade_id: "vivaz" };

  it("ligado à árvore: só locais debaixo do ponto ligado", () => {
    expect(localNoChecklist(uhGarden, { tipo: "ambos" }, ["hosp"], arvore)).toBe(true);
    expect(localNoChecklist(casaMaquinas, { tipo: "ambos" }, ["hosp"], arvore)).toBe(false);
    expect(localNoChecklist(uhGarden, { tipo: "suite" }, ["suite"], arvore)).toBe(false);
  });

  it("sem ligação vale a regra antiga", () => {
    expect(localNoChecklist(uhGarden, { tipo: "apartamento" }, [], arvore)).toBe(true);
    expect(localNoChecklist(casaMaquinas, { tipo: "area" }, [], arvore)).toBe(true);
  });

  it("ficha do local pela categoria; UH herda suíte/apartamento do tipo", () => {
    expect(fichaDoLocal(arvore, "garden")).toEqual({ fichaUh: true, grupos: ["eletronico", "mobilia"] });
    expect(fichaDoLocal(arvore, "cm")).toEqual({ fichaUh: false, grupos: ["equipamento"] });
    expect(fichaDoLocal(arvore, null)).toEqual({ fichaUh: false, grupos: [] });
    expect(tipoLegadoDoLocal(arvore, "garden")).toBe("apartamento");
    expect(tipoLegadoDoLocal(arvore, "cm")).toBe("area");
  });
});

describe("filtro por caminho (as duas unidades juntas)", () => {
  const comAqua = [...arvore, lugar("aq-cm", "aq-oper", "tipo", "Casas de Máquinas", { propriedade_id: "aqua" })];

  it("opções por nome, sem repetir entre unidades", () => {
    expect(opcoesDoCaminho(comAqua, null, [])).toEqual(["Hospedagem", "Operacional"]);
    expect(opcoesDoCaminho(comAqua, null, ["Operacional"])).toEqual(["Casa de Máquinas", "Casas de Máquinas"]);
    expect(opcoesDoCaminho(comAqua, "aqua", ["Operacional"])).toEqual(["Casas de Máquinas"]);
    expect(opcoesDoCaminho(comAqua, null, ["Hospedagem", "UH Apartamento"])).toEqual(["Garden"]);
  });

  it("caminho pega as duas unidades e respeita o nível", () => {
    expect(noCaminho(comAqua, "aq-cm", ["operacional"])).toBe(true);
    expect(noCaminho(comAqua, "cm", ["Operacional"])).toBe(true);
    expect(noCaminho(comAqua, "garden", ["Operacional"])).toBe(false);
    expect(registroNoCaminho(comAqua, ["Operacional"], null, ["aq-cm"])).toBe(true);
    expect(textoParaCaminho(caminhoParaTexto(["Operacional", "Casas de Máquinas"]))).toEqual(["Operacional", "Casas de Máquinas"]);
  });
});

describe("filtro em cascata", () => {
  it("mudar um nível limpa os de baixo; alvo é o mais específico", () => {
    const f = mudarFiltroLugar({ categoria: "hosp", tipo: "apto", classificacao: "garden" }, "tipo", "suite");
    expect(f).toEqual({ categoria: "hosp", tipo: "suite", classificacao: "" });
    expect(alvoDoFiltro(f)).toBe("suite");
    expect(alvoDoFiltro({ categoria: "", tipo: "", classificacao: "" })).toBeNull();
    expect(filtroDoLugar(arvore, "garden")).toEqual({ categoria: "hosp", tipo: "apto", classificacao: "garden" });
  });

  it("registro no filtro pelo local ou, sem local, pelo checklist", () => {
    expect(noLugarFiltrado(arvore, "hosp", "garden")).toBe(true);
    expect(noLugarFiltrado(arvore, "oper", "garden")).toBe(false);
    expect(noLugarFiltrado(arvore, "oper", null, ["cm"])).toBe(true);
    expect(noLugarFiltrado(arvore, null, null)).toBe(true);
    expect(rotuloOndeAplica(arvore, ["suite", "cm"])).toBe("Hospedagem › UH Suíte, Operacional › Casa de Máquinas");
  });
});
