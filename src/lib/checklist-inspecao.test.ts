import { describe, expect, it } from "vitest";
import {
  FILTROS_VAZIOS,
  acoesInspecao,
  duracaoMinutos,
  emAberto,
  filtrarInspecoes,
  formatarDataCurta,
  hojeEmSaoPaulo,
  opcoesDistintas,
  rotuloStatus,
  type LinhaInspecao,
} from "./checklist-inspecao";

describe("status", () => {
  it("aberta é em andamento ou pausada", () => {
    expect(emAberto("em_andamento")).toBe(true);
    expect(emAberto("pausada")).toBe(true);
    expect(emAberto("cancelada")).toBe(false);
    expect(emAberto("finalizada")).toBe(false);
  });

  it("rótulo em português", () => {
    expect(rotuloStatus("pausada")).toBe("Pausada");
    expect(rotuloStatus("outro")).toBe("outro");
  });
});

describe("acoesInspecao", () => {
  const eu = "u1";
  const aplicador = { id: eu, cuidaDoSetor: false };
  const lider = { id: "u2", cuidaDoSetor: true };
  const outro = { id: "u3", cuidaDoSetor: false };

  it("quem aplicou continua, pausa e descarta o próprio, mas não cancela", () => {
    expect(acoesInspecao({ status: "em_andamento", inspetor_id: eu }, aplicador)).toEqual({
      continuar: true,
      pausar: true,
      cancelar: false,
      excluir: true,
    });
  });

  it("pausada não pausa de novo, mas continua", () => {
    expect(acoesInspecao({ status: "pausada", inspetor_id: eu }, aplicador)).toMatchObject({
      continuar: true,
      pausar: false,
    });
  });

  it("líder do setor mexe no checklist de outra pessoa e cancela", () => {
    expect(acoesInspecao({ status: "em_andamento", inspetor_id: eu }, lider)).toEqual({
      continuar: true,
      pausar: true,
      cancelar: true,
      excluir: true,
    });
  });

  it("quem não é dono nem cuida do setor não mexe", () => {
    expect(Object.values(acoesInspecao({ status: "em_andamento", inspetor_id: eu }, outro))).not.toContain(true);
  });

  it("cancelado só o líder exclui; finalizado ninguém mexe por aqui", () => {
    expect(acoesInspecao({ status: "cancelada", inspetor_id: eu }, lider).excluir).toBe(true);
    expect(acoesInspecao({ status: "cancelada", inspetor_id: eu }, aplicador).excluir).toBe(false);
    expect(Object.values(acoesInspecao({ status: "finalizada", inspetor_id: eu }, lider))).not.toContain(true);
  });
});

describe("datas", () => {
  it("duração em minutos só depois de finalizar", () => {
    expect(duracaoMinutos("2026-11-12T10:00:00Z", "2026-11-12T10:45:00Z")).toBe(45);
    expect(duracaoMinutos("2026-11-12T10:00:00Z", null)).toBeNull();
  });

  it("hoje é pelo horário de Brasília", () => {
    // 01:30 UTC do dia 13 ainda é dia 12 em Brasília.
    expect(hojeEmSaoPaulo(new Date("2026-11-13T01:30:00Z"))).toBe("2026-11-12");
  });

  it("data curta sem fuso", () => {
    expect(formatarDataCurta("2026-11-12")).toBe("12/11/2026");
  });
});

describe("filtrarInspecoes", () => {
  const linha = (over: Partial<LinhaInspecao>): LinhaInspecao => ({
    id: "1",
    status: "finalizada",
    dataReferencia: "2026-11-10",
    criadoEm: "2026-11-10T10:00:00Z",
    finalizadaEm: "2026-11-10T10:30:00Z",
    setorId: "s-gov",
    checklistId: "c1",
    checklist: "Revisão de suítes",
    identificacao: null,
    local: "1005",
    localId: "l1",
    colaborador: "Ana Souza",
    colaboradorId: "col1",
    aplicador: "Samara",
    aplicadorId: "u1",
    ...over,
  });
  const lista = [
    linha({ id: "a" }),
    linha({ id: "b", status: "em_andamento", setorId: "s-man", colaborador: "João", colaboradorId: "col2" }),
    linha({ id: "c", dataReferencia: "2026-11-12", aplicadorId: "u2", aplicador: "Silvano" }),
  ];
  const ids = (f: Partial<typeof FILTROS_VAZIOS>) =>
    filtrarInspecoes(lista, { ...FILTROS_VAZIOS, ...f }).map((i) => i.id);

  it("sem filtro devolve tudo", () => {
    expect(ids({})).toEqual(["a", "b", "c"]);
  });

  it("filtra por status, setor, colaborador e aplicador", () => {
    expect(ids({ status: "em_andamento" })).toEqual(["b"]);
    expect(ids({ setorId: "s-gov" })).toEqual(["a", "c"]);
    expect(ids({ colaboradorId: "col2" })).toEqual(["b"]);
    expect(ids({ aplicadorId: "u2" })).toEqual(["c"]);
  });

  it("período pela data de referência, com as pontas incluídas", () => {
    expect(ids({ de: "2026-11-11" })).toEqual(["c"]);
    expect(ids({ de: "2026-11-10", ate: "2026-11-10" })).toEqual(["a", "b"]);
  });

  it("busca sem acento em checklist, local, colaborador e aplicador", () => {
    expect(ids({ busca: "joao" })).toEqual(["b"]);
    expect(ids({ busca: "suites" })).toEqual(["a", "b", "c"]);
  });
});

describe("opcoesDistintas", () => {
  it("tira repetidos e vazios e ordena", () => {
    const itens = [
      { id: "2", nome: "Silvano" },
      { id: "1", nome: "Ana" },
      { id: "2", nome: "Silvano" },
      { id: null, nome: "Sem id" },
    ];
    expect(opcoesDistintas(itens, (i) => i.id, (i) => i.nome)).toEqual([
      { valor: "1", rotulo: "Ana" },
      { valor: "2", rotulo: "Silvano" },
    ]);
  });
});
