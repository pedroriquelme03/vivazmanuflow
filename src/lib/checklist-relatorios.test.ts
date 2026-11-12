import { describe, expect, it } from "vitest";
import {
  abertosComTempo,
  atalhoAtivo,
  atalhosPeriodo,
  filtrarRelatorio,
  lerFiltrosRelatorio,
  linkRelatorio,
  resumoPor,
  resumoPorDia,
  somarDias,
  totaisRelatorio,
  type InspecaoRelatorio,
} from "./checklist-relatorios";

const HOJE = "2026-11-12";

const insp = (over: Partial<InspecaoRelatorio>): InspecaoRelatorio => ({
  id: "1",
  status: "finalizada",
  criadoEm: "2026-11-12T10:00:00Z",
  finalizadaEm: "2026-11-12T10:30:00Z",
  dataReferencia: "2026-11-12",
  checklistId: "c1",
  checklist: "Revisão de suítes",
  setorId: "gov",
  colaboradorId: "ana",
  colaborador: "Ana",
  aplicadorId: "u1",
  aplicador: "Samara",
  local: "1005",
  sim: 8,
  nao: 2,
  planos: 1,
  ...over,
});

describe("filtros", () => {
  it("abre nos últimos 30 dias; com de/ate vazios é tudo", () => {
    expect(lerFiltrosRelatorio({}, HOJE)).toMatchObject({ de: "2026-10-14", ate: HOJE });
    expect(lerFiltrosRelatorio({ de: "", ate: "" }, HOJE)).toMatchObject({ de: "", ate: "" });
  });

  it("um dia só, datas invertidas e status estranho", () => {
    expect(lerFiltrosRelatorio({ de: "2026-11-05", ate: "2026-11-05" }, HOJE)).toMatchObject({ de: "2026-11-05", ate: "2026-11-05" });
    expect(lerFiltrosRelatorio({ de: "2026-11-10", ate: "2026-11-01" }, HOJE)).toMatchObject({ de: "2026-11-01", ate: "2026-11-10" });
    expect(lerFiltrosRelatorio({ status: "x", de: "abc" }, HOJE)).toMatchObject({ status: "", de: "" });
  });

  it("atalhos e link mantêm o resto dos filtros", () => {
    expect(somarDias(HOJE, -6)).toBe("2026-11-06");
    expect(atalhosPeriodo(HOJE)[1]).toMatchObject({ id: "7", de: "2026-11-06" });
    const f = lerFiltrosRelatorio({ colaborador: "ana" }, HOJE);
    expect(atalhoAtivo(f, HOJE)).toBe("30");
    expect(linkRelatorio(f, { de: "", ate: "" })).toBe("/governanca/admin/relatorios?de=&ate=&colaborador=ana");
  });

  it("filtra por período, setor, checklist, colaborador, aplicador e status", () => {
    const lista = [
      insp({ id: "a" }),
      insp({ id: "b", dataReferencia: "2026-11-01", colaboradorId: "joao" }),
      insp({ id: "c", status: "em_andamento", aplicadorId: "u2", setorId: "man" }),
    ];
    const ids = (f: Record<string, string>) => filtrarRelatorio(lista, lerFiltrosRelatorio({ de: "", ate: "", ...f }, HOJE)).map((i) => i.id);
    expect(ids({ de: "2026-11-05" })).toEqual(["a", "c"]);
    expect(ids({ colaborador: "joao" })).toEqual(["b"]);
    expect(ids({ aplicador: "u2" })).toEqual(["c"]);
    expect(ids({ setor: "gov", status: "finalizada" })).toEqual(["a", "b"]);
  });
});

describe("métricas", () => {
  const lista = [
    insp({ id: "a" }),
    insp({ id: "b", sim: 10, nao: 0, planos: 0, finalizadaEm: "2026-11-12T11:00:00Z" }),
    insp({ id: "c", status: "em_andamento", finalizadaEm: null, criadoEm: "2026-11-12T08:00:00Z" }),
    insp({ id: "d", status: "cancelada", colaboradorId: "joao", colaborador: "João" }),
  ];

  it("por colaborador: finalizadas, abertas, conformidade e tempo médio; cancelada não conta", () => {
    const [ana, ...resto] = resumoPor(lista, (i) => ({ id: i.colaboradorId, nome: i.colaborador }), "Sem colaborador");
    expect(resto).toEqual([]);
    expect(ana).toMatchObject({ nome: "Ana", finalizadas: 2, abertas: 1, sim: 18, nao: 2, planos: 1, conformidade: 90, tempoMedio: 45 });
  });

  it("totais do período", () => {
    expect(totaisRelatorio(lista)).toMatchObject({ finalizadas: 2, abertas: 1, canceladas: 1, conformidade: 90, tempoMedio: 45, tempoMaximo: 60 });
  });

  it("abertos com o tempo, e por dia", () => {
    const [aberto] = abertosComTempo(lista, new Date("2026-11-12T10:00:00Z").getTime());
    expect(aberto).toMatchObject({ id: "c", minutosAberto: 120 });
    expect(resumoPorDia(lista)).toEqual([{ data: "2026-11-12", finalizadas: 2, abertas: 1, sim: 18, nao: 2 }]);
  });
});
