import { describe, expect, it } from "vitest";
import {
  fechamentoMensal,
  notaInspecao,
  notaProdutividade,
  agruparPorGrupo,
  agruparPorSecao,
  formatarValor,
  itemRespondido,
  normalizarBusca,
  conformidade,
  filtrarAcomodacoes,
  localServeAoChecklist,
  inicioPeriodo,
  itensMaisReprovados,
  papelGovernanca,
  proximaOrdem,
  resumoPorCamareira,
  secaoCompleta,
  colunaKanban,
  formatarDuracao,
  indicadoresAndamento,
  resumoPorAplicador,
  secaoParaRetomar,
  tempoDesde,
  type Acomodacao,
} from "./governanca";

describe("colunaKanban", () => {
  it("em andamento enquanto não finaliza", () => {
    expect(colunaKanban({ status: "em_andamento", planos: [] })).toBe("andamento");
  });

  it("finalizado sem plano fica sem problema", () => {
    expect(colunaKanban({ status: "finalizada", planos: [] })).toBe("ok");
  });

  it("plano aberto é pendência; todos resolvidos viram resolvida", () => {
    expect(
      colunaKanban({
        status: "finalizada",
        planos: [{ resolvido_em: "2026-10-20T12:00:00Z" }, { resolvido_em: null }],
      }),
    ).toBe("pendencia");
    expect(
      colunaKanban({ status: "finalizada", planos: [{ resolvido_em: "2026-10-20T12:00:00Z" }] }),
    ).toBe("resolvida");
  });
});

describe("andamento nos relatórios", () => {
  const agora = new Date("2026-10-20T15:00:00Z").getTime();
  const inspecoes = [
    { id: "a", status: "em_andamento", criado_em: "2026-10-20T14:30:00Z", finalizada_em: null, aplicador: "Ana" },
    { id: "b", status: "em_andamento", criado_em: "2026-10-20T10:00:00Z", finalizada_em: null, aplicador: "Bia" },
    {
      id: "c",
      status: "finalizada",
      criado_em: "2026-10-20T12:00:00Z",
      finalizada_em: "2026-10-20T12:30:00Z",
      aplicador: "Ana",
    },
  ];

  it("conta parados, tempo de preenchimento e pendências", () => {
    const r = indicadoresAndamento(
      inspecoes,
      [
        { criado_em: "2026-10-20T12:30:00Z", resolvido_em: "2026-10-20T14:30:00Z" },
        { criado_em: "2026-10-20T12:30:00Z", resolvido_em: null },
      ],
      agora,
    );
    expect(r.emAndamento).toBe(2);
    expect(r.parados).toBe(1);
    expect(r.tempoPreenchimento).toBe(30);
    expect(r.planosAbertos).toBe(1);
    expect(r.planosResolvidos).toBe(1);
    expect(r.tempoResolucao).toBe(120);
  });

  it("pausada conta como aberta mas não como parada; cancelada fica de fora", () => {
    const velha = { criado_em: "2026-10-19T08:00:00Z", finalizada_em: null, aplicador: "Ana" };
    const r = indicadoresAndamento(
      [
        { id: "p", status: "pausada", ...velha },
        { id: "x", status: "cancelada", ...velha },
      ],
      [],
      agora,
    );
    expect(r.emAndamento).toBe(1);
    expect(r.parados).toBe(0);
    expect(resumoPorAplicador([{ id: "x", status: "cancelada", ...velha }], [])).toEqual([]);
  });

  it("resume por aplicador", () => {
    const r = resumoPorAplicador(inspecoes, [
      { inspecao_id: "c", resposta: "sim", pergunta_texto: "x" },
      { inspecao_id: "c", resposta: "nao", pergunta_texto: "y" },
    ]);
    expect(r[0]).toEqual({ nome: "Ana", finalizadas: 1, emAndamento: 1, sim: 1, nao: 1, tempoMedio: 30 });
  });

  it("formata durações e tempo desde", () => {
    expect(formatarDuracao(null)).toBe("—");
    expect(formatarDuracao(45)).toBe("45 min");
    expect(formatarDuracao(130)).toBe("2 h 10 min");
    expect(tempoDesde("2026-10-20T14:48:00Z", agora)).toBe("há 12 min");
  });
});

describe("secaoParaRetomar", () => {
  it("volta na primeira seção com item obrigatório sem resposta", () => {
    const secoes = [
      { gov_perguntas: [{ id: "p1" }] },
      { gov_perguntas: [] },
      { gov_perguntas: [{ id: "p2" }] },
    ];
    expect(secaoParaRetomar(secoes, { p1: { resposta: "sim", plano: null } })).toBe(2);
    expect(
      secaoParaRetomar(secoes, {
        p1: { resposta: "sim", plano: null },
        p2: { resposta: "sim", plano: null },
      }),
    ).toBe(2);
    expect(secaoParaRetomar(secoes, {})).toBe(0);
  });
});

const uh = (numero: string, tipo: string): Acomodacao => ({
  id: numero,
  numero,
  tipo,
  propriedade_id: "p-vivaz",
  lugar_id: null,
  categoria: null,
  acomodacao: null,
  permite_pet: false,
  ativo: true,
  criado_em: "",
});

describe("papelGovernanca", () => {
  it("admin do sistema é admin da governança", () => {
    expect(papelGovernanca("admin", null, ["checklist"])).toBe("admin");
    expect(papelGovernanca("admin", "camareira", ["ti", "checklist"])).toBe("admin");
  });

  it("demais seguem o perfil no checklist, com aplicador como padrão", () => {
    expect(papelGovernanca("lider", "lider", ["checklist"])).toBe("lider");
    expect(papelGovernanca("colaborador", "camareira", ["checklist"])).toBe("camareira");
    expect(papelGovernanca("lider", null, ["manutencao", "checklist"])).toBe("camareira");
  });

  it("sem o ambiente Checklist marcado ninguém entra, nem o admin", () => {
    expect(papelGovernanca("admin", null, ["manutencao", "ti"])).toBeNull();
    expect(papelGovernanca("lider", "lider", ["manutencao"])).toBeNull();
    expect(papelGovernanca("solicitante", null, ["checklist"])).toBeNull();
  });
});

describe("localServeAoChecklist", () => {
  const suite = { tipo: "suite" };
  const apto = { tipo: "apartamento" };
  const area = { tipo: "area" };

  it("checklist de área mostra só áreas", () => {
    expect([suite, apto, area].filter((l) => localServeAoChecklist(l, { tipo: "area" }))).toEqual([area]);
  });

  it("checklist de UH mostra só as UHs do tipo dele", () => {
    expect([suite, apto, area].filter((l) => localServeAoChecklist(l, { tipo: "ambos" }))).toEqual([suite, apto]);
    expect([suite, apto, area].filter((l) => localServeAoChecklist(l, { tipo: "suite" }))).toEqual([suite]);
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

describe("complementos obrigatórios e condicionais no preenchimento", () => {
  const comFoto = { id: "q", tipo: "sim_nao", plano_acao: false, exige: { nao: ["foto"] } };

  it("Não com foto obrigatória só segue com a foto", () => {
    expect(itemRespondido(comFoto, { resposta: "nao", plano: null })).toBe(false);
    expect(itemRespondido(comFoto, { resposta: "nao", plano: null, anexoPreview: "blob:x" })).toBe(true);
    expect(itemRespondido(comFoto, { resposta: "sim", plano: null })).toBe(true);
  });

  it("item diferente do cadastrado só segue dizendo o que foi encontrado", () => {
    const q = { id: "tv", tipo: "sim_nao", plano_acao: false };
    expect(itemRespondido(q, { resposta: "sim", plano: null, itemDiferente: true, itemEncontrado: " " })).toBe(false);
    expect(itemRespondido(q, { resposta: "sim", plano: null, itemDiferente: true, itemEncontrado: "LG 43'" })).toBe(true);
  });

  it("pergunta escondida não trava a seção, e seção escondida é pulada ao retomar", () => {
    const secoes = [
      { id: "s1", gov_perguntas: [{ id: "a" }, { id: "b" }] },
      { id: "s2", gov_perguntas: [{ id: "c" }] },
    ];
    const respostas = { a: { resposta: "sim" as const, plano: null } };
    expect(secaoCompleta(secoes[0].gov_perguntas, respostas, new Set(["b"]))).toBe(true);
    expect(
      secaoParaRetomar(secoes, respostas, { perguntas: new Set(["b"]), secoes: new Set(["s2"]) }),
    ).toBe(0);
    expect(secaoParaRetomar(secoes, respostas, { perguntas: new Set(["b"]), secoes: new Set() })).toBe(1);
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

  it("busca ignora acento", () => {
    expect(normalizarBusca(" Manutenção ")).toBe("manutencao");
  });
});

describe("nota da vistoria e fechamento do mês", () => {
  it("começa em 100 e cada Não tira o mesmo tanto", () => {
    expect(notaInspecao(10, 0)).toBe(100);
    expect(notaInspecao(8, 2)).toBe(80);
    expect(notaInspecao(0, 4)).toBe(0);
    expect(notaInspecao(0, 0)).toBeNull();
  });

  it("converte a média do mês para a escala de produtividade de 100 a 300", () => {
    expect(notaProdutividade(0)).toBe(100);
    expect(notaProdutividade(50)).toBe(200);
    expect(notaProdutividade(100)).toBe(300);
  });

  it("faz a média das vistorias de cada camareira", () => {
    const linhas = fechamentoMensal([
      { camareira: "Maria", sim: 10, nao: 0 },
      { camareira: "Maria", sim: 8, nao: 2 },
      { camareira: "Ana", sim: 5, nao: 5 },
      { camareira: "Ana", sim: 0, nao: 0 },
    ]);
    expect(linhas).toEqual([
      { nome: "Ana", vistorias: 1, sim: 5, nao: 5, media: 50, produtividade: 200 },
      { nome: "Maria", vistorias: 2, sim: 18, nao: 2, media: 90, produtividade: 280 },
    ]);
  });
});
