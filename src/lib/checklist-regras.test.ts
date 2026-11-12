import { describe, expect, it } from "vitest";
import {
  complementosExigidos,
  complementosFaltando,
  lerExige,
  notaPonderada,
  ocultos,
  respostasDadas,
  respostasPossiveis,
  type Dependencia,
} from "./checklist-regras";

describe("respostasDadas", () => {
  it("lê a resposta conforme o tipo", () => {
    expect(respostasDadas("sim_nao", { resposta: "nao" })).toEqual(["nao"]);
    expect(respostasDadas("carinhas", { valor: "ruim" })).toEqual(["ruim"]);
    expect(respostasDadas("selecao_unica", { valor: "Outro" })).toEqual(["Outro"]);
    expect(respostasDadas("selecao_multipla", { selecionadas: ["A", "B"] })).toEqual(["A", "B"]);
  });

  it("N/A, vazio e texto livre não disparam nada", () => {
    expect(respostasDadas("sim_nao", { resposta: "na" })).toEqual([]);
    expect(respostasDadas("sim_nao", undefined)).toEqual([]);
    expect(respostasDadas("texto_curto", { valor: "sim" })).toEqual([]);
  });

  it("respostas possíveis por tipo", () => {
    expect(respostasPossiveis("sim_nao", [])).toEqual(["sim", "nao"]);
    expect(respostasPossiveis("selecao_unica", ["A", "B"])).toEqual(["A", "B"]);
    expect(respostasPossiveis("numero", ["A"])).toEqual([]);
  });
});

describe("complementos obrigatórios", () => {
  const item = { tipo: "sim_nao", exige: { nao: ["foto", "comentario"], sim: [] } };

  it("lerExige ignora o que não é válido", () => {
    expect(lerExige({ nao: ["foto", "x"], sim: "foto", vazio: [] })).toEqual({ nao: ["foto"] });
    expect(lerExige(null)).toEqual({});
    expect(lerExige([1])).toEqual({});
  });

  it("só a resposta configurada exige", () => {
    expect(complementosExigidos(item, { resposta: "sim" })).toEqual([]);
    expect(complementosExigidos(item, { resposta: "nao" })).toEqual(["comentario", "foto"]);
  });

  it("mostra o que ainda falta", () => {
    expect(complementosFaltando(item, { resposta: "nao", comentario: " " })).toEqual(["comentario", "foto"]);
    expect(complementosFaltando(item, { resposta: "nao", comentario: "quebrado", anexoPreview: "blob:1" })).toEqual([]);
  });

  it("lista de várias opções soma as exigências das marcadas", () => {
    const lista = { tipo: "selecao_multipla", exige: { Vazamento: ["foto"], Sujo: ["comentario"] } };
    expect(complementosExigidos(lista, { selecionadas: ["Vazamento", "Sujo"] })).toEqual(["comentario", "foto"]);
  });
});

describe("ocultos (condicionais)", () => {
  const perguntas = new Map([
    ["evento", { tipo: "selecao_unica", secao_id: "s1" }],
    ["qual", { tipo: "texto_longo", secao_id: "s1" }],
    ["usa", { tipo: "sim_nao", secao_id: "s1" }],
    ["horario", { tipo: "texto_curto", secao_id: "s2" }],
    ["detalhe", { tipo: "sim_nao", secao_id: "s2" }],
    ["obs", { tipo: "texto_longo", secao_id: "s2" }],
  ]);
  const deps: Dependencia[] = [
    { id: "1", pergunta_id: "evento", gatilho: "Outro", filho_pergunta_id: "qual", filho_secao_id: null },
    { id: "2", pergunta_id: "usa", gatilho: "sim", filho_pergunta_id: null, filho_secao_id: "s2" },
    { id: "3", pergunta_id: "detalhe", gatilho: "nao", filho_pergunta_id: "obs", filho_secao_id: null },
  ];

  it("sem resposta, os alvos ficam escondidos", () => {
    const o = ocultos(deps, {}, perguntas);
    expect([...o.perguntas].sort()).toEqual(["detalhe", "horario", "obs", "qual"]);
    expect([...o.secoes]).toEqual(["s2"]);
  });

  it("a resposta do gatilho mostra a pergunta ou a seção", () => {
    const o = ocultos(deps, { evento: { valor: "Outro" }, usa: { resposta: "sim" } }, perguntas);
    expect(o.perguntas.has("qual")).toBe(false);
    expect(o.secoes.size).toBe(0);
    expect(o.perguntas.has("horario")).toBe(false);
    expect(o.perguntas.has("obs")).toBe(true);
  });

  it("em cadeia: pai escondido não mostra o filho", () => {
    const o = ocultos(deps, { usa: { resposta: "nao" }, detalhe: { resposta: "nao" } }, perguntas);
    expect(o.perguntas.has("obs")).toBe(true);
    const visivel = ocultos(deps, { usa: { resposta: "sim" }, detalhe: { resposta: "nao" } }, perguntas);
    expect(visivel.perguntas.has("obs")).toBe(false);
  });
});

describe("notaPonderada", () => {
  it("pesa cada Sim/Não pelo peso", () => {
    expect(
      notaPonderada([
        { resposta: "sim", peso: 3 },
        { resposta: "nao", peso: 1 },
      ]),
    ).toBe(75);
  });

  it("ignora N/A, outros tipos e peso 0; sem nada devolve null", () => {
    expect(
      notaPonderada([
        { resposta: "na", peso: 5 },
        { resposta: null, peso: 1 },
        { resposta: "nao", peso: 0 },
        { resposta: "sim", peso: 1 },
      ]),
    ).toBe(100);
    expect(notaPonderada([])).toBeNull();
  });
});
