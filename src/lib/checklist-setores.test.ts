import { describe, expect, it } from "vitest";
import {
  SEM_SETOR,
  agruparPorSetor,
  buscarPorSetor,
  cuidaDoSetor,
  limparNome,
  nomeRepetido,
  passoEscolha,
  rotuloSetor,
  setoresDaPessoa,
  setoresPorPropriedade,
  type SetorChecklist,
} from "./checklist-setores";

const vivaz = { id: "p-vivaz", nome: "Vivaz Cataratas", ativo: true };
const aqua = { id: "p-aqua", nome: "Aquamania", ativo: true };
const propriedades = [vivaz, aqua];

function setor(id: string, nome: string, propriedade_id: string): SetorChecklist {
  return { id, nome, propriedade_id, ativo: true, criado_em: "2026-11-12T00:00:00Z" };
}

const governanca = setor("s-gov", "Governança", vivaz.id);
const manutencao = setor("s-man", "Manutenção", vivaz.id);
const geral = setor("s-geral", "Geral", aqua.id);
const setores = [manutencao, geral, governanca];

describe("limparNome", () => {
  it("tira espaços nas pontas e repetidos no meio", () => {
    expect(limparNome("  Casa   de  máquinas ")).toBe("Casa de máquinas");
  });
});

describe("nomeRepetido", () => {
  const existentes = [{ id: "1", nome: "Governança" }];

  it("acha o mesmo nome sem olhar acento, maiúscula ou espaço", () => {
    expect(nomeRepetido(" governanca ", existentes)).toBe(true);
  });

  it("não acusa o próprio item ao renomear", () => {
    expect(nomeRepetido("GOVERNANÇA", existentes, "1")).toBe(false);
  });

  it("nome diferente passa", () => {
    expect(nomeRepetido("Manutenção", existentes)).toBe(false);
  });
});

describe("rotuloSetor", () => {
  it("mostra propriedade e setor", () => {
    expect(rotuloSetor("s-geral", setores, propriedades)).toBe("Aquamania · Geral");
  });

  it("sem setor ou setor desconhecido vira Sem setor", () => {
    expect(rotuloSetor(null, setores, propriedades)).toBe(SEM_SETOR);
    expect(rotuloSetor("x", setores, propriedades)).toBe(SEM_SETOR);
  });
});

describe("buscarPorSetor", () => {
  const itens = [
    { nome: "Revisão de suítes", setor_id: "s-gov" },
    { nome: "Casas de máquinas", setor_id: "s-geral" },
  ];

  it("acha pelo nome ou pelo setor e pela propriedade, sem acento", () => {
    expect(buscarPorSetor(itens, "revisao", setores, propriedades).map((i) => i.nome)).toEqual(["Revisão de suítes"]);
    expect(buscarPorSetor(itens, "governanca", setores, propriedades).map((i) => i.nome)).toEqual([
      "Revisão de suítes",
    ]);
    expect(buscarPorSetor(itens, "aquamania", setores, propriedades).map((i) => i.nome)).toEqual(["Casas de máquinas"]);
  });

  it("busca vazia devolve tudo", () => {
    expect(buscarPorSetor(itens, "  ", setores, propriedades)).toHaveLength(2);
  });
});

describe("setoresPorPropriedade", () => {
  const extra = { id: "p-novo", nome: "Bistrô", ativo: true };

  it("lista propriedades e setores em ordem alfabética", () => {
    expect(
      setoresPorPropriedade(setores, propriedades).map((g) => [g.propriedade.nome, g.setores.map((s) => s.nome)]),
    ).toEqual([
      ["Aquamania", ["Geral"]],
      ["Vivaz Cataratas", ["Governança", "Manutenção"]],
    ]);
  });

  it("propriedade sem setor só aparece quando pedido", () => {
    expect(setoresPorPropriedade(setores, [...propriedades, extra]).map((g) => g.propriedade.id)).not.toContain(
      "p-novo",
    );
    expect(setoresPorPropriedade(setores, [...propriedades, extra], true)[1]).toEqual({
      propriedade: extra,
      setores: [],
    });
  });
});

describe("cuidaDoSetor", () => {
  it("admin sempre; líder só nos dele; aplicador nunca", () => {
    expect(cuidaDoSetor("admin", "s-gov", [])).toBe(true);
    expect(cuidaDoSetor("lider", "s-gov", [governanca])).toBe(true);
    expect(cuidaDoSetor("lider", "s-man", [governanca])).toBe(false);
    expect(cuidaDoSetor("camareira", "s-gov", [governanca])).toBe(false);
  });
});

describe("setoresDaPessoa", () => {
  it("admin usa todos, em ordem alfabética", () => {
    expect(setoresDaPessoa("admin", setores, []).map((s) => s.nome)).toEqual([
      "Geral",
      "Governança",
      "Manutenção",
    ]);
  });

  it("líder e aplicador só usam os setores liberados", () => {
    expect(setoresDaPessoa("lider", setores, ["s-man"]).map((s) => s.id)).toEqual(["s-man"]);
    expect(setoresDaPessoa("camareira", setores, []).map((s) => s.id)).toEqual([]);
  });

  it("quem não está no checklist não usa nenhum", () => {
    expect(setoresDaPessoa(null, setores, ["s-man"])).toEqual([]);
  });
});

describe("passoEscolha", () => {
  const item = (nome: string, setor_id: string) => ({ nome, setor_id });
  const grupos = agruparPorSetor(
    [item("Suítes", "s-gov"), item("Ronda", "s-man"), item("Casas de máquinas", "s-geral")],
    setores,
    propriedades,
  );

  it("começa escolhendo a propriedade quando há mais de uma", () => {
    expect(passoEscolha(grupos, null, null).etapa).toBe("propriedade");
  });

  it("depois o setor, e por fim o checklist", () => {
    expect(passoEscolha(grupos, "p-vivaz", null).etapa).toBe("setor");
    const passo = passoEscolha(grupos, "p-vivaz", "s-man");
    expect(passo.etapa).toBe("checklist");
    expect(passo.etapa === "checklist" && passo.setor.itens.map((i) => i.nome)).toEqual(["Ronda"]);
  });

  it("pula a propriedade e o setor quando só existe um", () => {
    const so = agruparPorSetor([item("Casas de máquinas", "s-geral")], setores, propriedades);
    expect(passoEscolha(so, null, null).etapa).toBe("checklist");
  });

  it("propriedade com um setor só pula direto para os checklists", () => {
    expect(passoEscolha(grupos, "p-aqua", null).etapa).toBe("checklist");
  });
});

describe("agruparPorSetor", () => {
  const item = (nome: string, setor_id: string | null) => ({ nome, setor_id });

  it("agrupa por propriedade e setor, tudo em ordem alfabética", () => {
    const grupos = agruparPorSetor(
      [item("Ronda", "s-man"), item("Suítes", "s-gov"), item("Apartamentos", "s-gov"), item("Casas de máquinas", "s-geral")],
      setores,
      propriedades,
    );
    expect(
      grupos.map((g) => [g.propriedade?.nome, g.setores.map((s) => [s.setor?.nome, s.itens.map((i) => i.nome)])]),
    ).toEqual([
      ["Aquamania", [["Geral", ["Casas de máquinas"]]]],
      [
        "Vivaz Cataratas",
        [
          ["Governança", ["Apartamentos", "Suítes"]],
          ["Manutenção", ["Ronda"]],
        ],
      ],
    ]);
  });

  it("sem setor, setor desconhecido ou de propriedade fora da lista vai para Sem setor no fim", () => {
    const grupos = agruparPorSetor(
      [item("A", null), item("B", "apagado"), item("C", "s-geral"), item("D", "s-gov")],
      setores,
      [vivaz],
    );
    expect(grupos.map((g) => g.propriedade?.nome ?? SEM_SETOR)).toEqual(["Vivaz Cataratas", SEM_SETOR]);
    expect(grupos[1].setores[0].itens.map((i) => i.nome)).toEqual(["A", "B", "C"]);
  });

  it("propriedade e setor sem itens não aparecem", () => {
    expect(agruparPorSetor([], setores, propriedades)).toEqual([]);
  });
});
