import { describe, expect, it } from "vitest";
import {
  SETE_DIAS_MS,
  concluidaNosUltimos7Dias,
  ordenarColuna,
  ordenarFilaPorPeso,
  ordenarPorConclusao,
  ordensDaColuna,
} from "./demanda-select";

describe("ordenarColuna", () => {
  const fila = [
    { id: "meio", peso: 9, criado_em: "2026-09-05T00:00:00.000Z" },
    { id: "velha", peso: 2, criado_em: "2026-09-01T00:00:00.000Z" },
    { id: "nova", peso: 5, criado_em: "2026-09-10T00:00:00.000Z" },
  ];

  it("fila aberta: peso, mais recentes ou mais antigas pela abertura", () => {
    expect(ordenarColuna(fila, false, "peso").map((d) => d.id)).toEqual([
      "meio",
      "nova",
      "velha",
    ]);
    expect(ordenarColuna(fila, false, "recentes").map((d) => d.id)).toEqual([
      "nova",
      "meio",
      "velha",
    ]);
    expect(ordenarColuna(fila, false, "antigas").map((d) => d.id)).toEqual([
      "velha",
      "meio",
      "nova",
    ]);
  });

  it("concluídas seguem a data de conclusão e não têm peso", () => {
    const concluidas = [
      { id: "antes", criado_em: "2026-09-10T00:00:00.000Z", concluido_em: "2026-09-11T00:00:00.000Z" },
      { id: "depois", criado_em: "2026-09-01T00:00:00.000Z", concluido_em: "2026-09-12T00:00:00.000Z" },
    ];
    expect(ordenarColuna(concluidas, true, "recentes").map((d) => d.id)).toEqual([
      "depois",
      "antes",
    ]);
    expect(ordenarColuna(concluidas, true, "antigas").map((d) => d.id)).toEqual([
      "antes",
      "depois",
    ]);
    expect(ordensDaColuna(true)).toEqual(["recentes", "antigas"]);
    expect(ordensDaColuna(false)).toEqual(["peso", "recentes", "antigas"]);
  });
});

describe("ordenarPorConclusao", () => {
  it("coloca a concluída mais recente em cima, ignorando peso e criação", () => {
    const lista = ordenarPorConclusao([
      {
        id: "velha",
        peso: 10,
        criado_em: "2026-09-17T18:00:00.000Z",
        concluido_em: "2026-09-17T12:00:00.000Z",
      },
      {
        id: "nova",
        peso: 2,
        criado_em: "2026-09-17T10:00:00.000Z",
        concluido_em: "2026-09-17T12:05:00.000Z",
      },
    ]);
    expect(lista.map((d) => d.id)).toEqual(["nova", "velha"]);
  });

  it("sem concluido_em vai para o fim", () => {
    const lista = ordenarPorConclusao([
      { id: "sem", concluido_em: null },
      { id: "com", concluido_em: "2026-09-17T12:00:00.000Z" },
    ]);
    expect(lista.map((d) => d.id)).toEqual(["com", "sem"]);
  });
});

describe("ordenarFilaPorPeso", () => {
  it("ainda ordena fila aberta por peso", () => {
    const lista = ordenarFilaPorPeso([
      { id: "leve", peso: 2, criado_em: "2026-09-01T00:00:00.000Z" },
      { id: "pesada", peso: 9, criado_em: "2026-09-10T00:00:00.000Z" },
    ]);
    expect(lista.map((d) => d.id)).toEqual(["pesada", "leve"]);
  });
});

describe("concluidaNosUltimos7Dias", () => {
  const agora = Date.parse("2026-09-17T18:00:00.000Z");

  it("aceita conclusão dentro de 7 dias", () => {
    expect(
      concluidaNosUltimos7Dias(
        new Date(agora - SETE_DIAS_MS + 60_000).toISOString(),
        agora,
      ),
    ).toBe(true);
  });

  it("recusa conclusão mais antiga que 7 dias", () => {
    expect(
      concluidaNosUltimos7Dias(
        new Date(agora - SETE_DIAS_MS - 60_000).toISOString(),
        agora,
      ),
    ).toBe(false);
  });
});
