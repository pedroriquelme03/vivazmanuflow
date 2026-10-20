import { describe, expect, it } from "vitest";
import {
  agruparPorCategoria,
  agruparPorGrupo,
  agruparPorSecao,
  formatarValor,
  itemRespondido,
  normalizarBusca,
  conformidade,
  filtrarAcomodacoes,
  inicioPeriodo,
  itensMaisReprovados,
  papelGovernanca,
  proximaOrdem,
  resumoPorCamareira,
  secaoCompleta,
  type Acomodacao,
} from "./governanca";

const uh = (numero: string, tipo: string): Acomodacao => ({
  id: numero,
  numero,
  tipo,
  ativo: true,
  criado_em: "",
});

describe("papelGovernanca", () => {
  it("admin do sistema é admin da governança", () => {
    expect(papelGovernanca("admin", null)).toBe("admin");
    expect(papelGovernanca("admin", "camareira")).toBe("admin");
  });

  it("demais seguem o campo do usuário", () => {
    expect(papelGovernanca("lider", "lider")).toBe("lider");
    expect(papelGovernanca("colaborador", "camareira")).toBe("camareira");
    expect(papelGovernanca("lider", null)).toBeNull();
    expect(papelGovernanca("colaborador", "outro")).toBeNull();
  });
});

describe("filtrarAcomodacoes", () => {
  const lista = [uh("1001", "apartamento"), uh("1105", "suite"), uh("1210", "apartamento")];

  it("filtra pelo andar", () => {
    expect(filtrarAcomodacoes(lista, "", "11").map((a) => a.numero)).toEqual(["1105"]);
  });

  it("busca por número ou tipo", () => {
    expect(filtrarAcomodacoes(lista, "suíte", null).map((a) => a.numero)).toEqual(["1105"]);
    expect(filtrarAcomodacoes(lista, "210", null).map((a) => a.numero)).toEqual(["1210"]);
  });
});

describe("secaoCompleta", () => {
  const perguntas = [{ id: "a" }, { id: "b" }];

  it("exige todas respondidas", () => {
    expect(secaoCompleta(perguntas, { a: { resposta: "sim", plano: null } })).toBe(false);
  });

  it("Não precisa do que fazer", () => {
    const base = { a: { resposta: "sim" as const, plano: null } };
    expect(
      secaoCompleta(perguntas, { ...base, b: { resposta: "nao", plano: { o_que_fazer: "  " } } }),
    ).toBe(false);
    expect(
      secaoCompleta(perguntas, { ...base, b: { resposta: "nao", plano: { o_que_fazer: "Trocar toalha" } } }),
    ).toBe(true);
  });
});

describe("agruparPorSecao", () => {
  it("ordena seções e perguntas", () => {
    const grupos = agruparPorSecao([
      { secao_nome: "Banheiro", secao_ordem: 2, pergunta_ordem: 2 },
      { secao_nome: "Quarto", secao_ordem: 1, pergunta_ordem: 1 },
      { secao_nome: "Banheiro", secao_ordem: 2, pergunta_ordem: 1 },
    ]);
    expect(grupos.map((g) => g.nome)).toEqual(["Quarto", "Banheiro"]);
    expect(grupos[1].itens.map((i) => i.pergunta_ordem)).toEqual([1, 2]);
  });
});

describe("relatórios", () => {
  const respostas = [
    { inspecao_id: "i1", resposta: "sim", pergunta_texto: "Cama" },
    { inspecao_id: "i1", resposta: "nao", pergunta_texto: "Toalha" },
    { inspecao_id: "i2", resposta: "nao", pergunta_texto: "Toalha" },
    { inspecao_id: "i2", resposta: "nao", pergunta_texto: "Cama" },
    { inspecao_id: "i3", resposta: "nao", pergunta_texto: "Toalha" },
  ];

  it("calcula conformidade", () => {
    expect(conformidade(3, 1)).toBe(75);
    expect(conformidade(0, 0)).toBe(0);
  });

  it("resume por camareira com mais Não primeiro", () => {
    const r = resumoPorCamareira(
      [
        { id: "i1", camareira: "Ana" },
        { id: "i2", camareira: "Bia" },
        { id: "i3", camareira: null },
      ],
      respostas,
    );
    expect(r[0]).toEqual({ nome: "Bia", inspecoes: 1, sim: 0, nao: 2 });
    expect(r.map((c) => c.nome)).toContain("Sem camareira");
  });

  it("lista os itens mais reprovados", () => {
    expect(itensMaisReprovados(respostas)).toEqual([
      { texto: "Toalha", qtd: 3 },
      { texto: "Cama", qtd: 1 },
    ]);
  });

  it("início do período zera a hora", () => {
    const d = inicioPeriodo("7", new Date(2026, 9, 19, 15, 30));
    expect(d?.getDate()).toBe(12);
    expect(d?.getHours()).toBe(0);
    expect(inicioPeriodo("todos")).toBeNull();
  });
});

describe("proximaOrdem", () => {
  it("vai depois da maior ordem", () => {
    expect(proximaOrdem([])).toBe(1);
    expect(proximaOrdem([{ ordem: 3 }, { ordem: 1 }])).toBe(4);
  });
});

describe("itemRespondido", () => {
  const vazio = { resposta: null, plano: null };

  it("opcional pode ficar em branco", () => {
    expect(itemRespondido({ id: "a", tipo: "texto_curto", obrigatoria: false }, vazio)).toBe(true);
    expect(itemRespondido({ id: "a", tipo: "texto_curto", obrigatoria: true }, vazio)).toBe(false);
  });

  it("N/A conta como respondido", () => {
    expect(itemRespondido({ id: "a", tipo: "numero" }, { resposta: "na", plano: null })).toBe(true);
  });

  it("Não sem plano de ação ativo não pede o que fazer", () => {
    expect(
      itemRespondido({ id: "a", tipo: "sim_nao", plano_acao: false }, { resposta: "nao", plano: null }),
    ).toBe(true);
    expect(
      itemRespondido({ id: "a", tipo: "sim_nao", plano_acao: true }, { resposta: "nao", plano: null }),
    ).toBe(false);
  });

  it("lista de várias opções precisa de ao menos uma", () => {
    const item = { id: "a", tipo: "selecao_multipla" };
    expect(itemRespondido(item, { ...vazio, selecionadas: [] })).toBe(false);
    expect(itemRespondido(item, { ...vazio, selecionadas: ["Bar"] })).toBe(true);
  });
});

describe("formatarValor", () => {
  it("escreve datas e números do jeito brasileiro", () => {
    expect(formatarValor("data", "2026-10-19")).toBe("19/10/2026");
    expect(formatarValor("mes_ano", "2026-10")).toBe("10/2026");
    expect(formatarValor("decimal", "7.4")).toBe("7,4");
    expect(formatarValor("porcentagem", "80")).toBe("80%");
  });

  it("junta as opções marcadas", () => {
    expect(formatarValor("selecao_multipla", '["Bar","Lanchonete"]')).toBe("Bar · Lanchonete");
  });

  it("mostra a carinha", () => {
    expect(formatarValor("carinhas", "bom")).toBe("🙂 Bom");
    expect(formatarValor("texto_curto", null)).toBe("—");
  });
});

describe("agrupamentos", () => {
  it("agrupa itens seguidos da mesma subárea", () => {
    const g = agruparPorGrupo([
      { grupo: null },
      { grupo: "Bomba 1" },
      { grupo: "Bomba 1" },
      { grupo: "Bomba 2" },
    ]);
    expect(g.map((x) => [x.grupo, x.itens.length])).toEqual([
      [null, 1],
      ["Bomba 1", 2],
      ["Bomba 2", 1],
    ]);
  });

  it("ordena categorias e deixa Outros por último", () => {
    const g = agruparPorCategoria([
      { categoria: null, nome: "Avaliação" },
      { categoria: "MANUTENÇÃO", nome: "B" },
      { categoria: "AQUAMANIA", nome: "A" },
    ]);
    expect(g.map((x) => x.categoria)).toEqual(["AQUAMANIA", "MANUTENÇÃO", "Outros"]);
  });

  it("busca ignora acento", () => {
    expect(normalizarBusca(" Manutenção ")).toBe("manutencao");
  });
});
