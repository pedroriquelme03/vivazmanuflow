import { describe, expect, it } from "vitest";
import { chamadosDoAmbiente, chamadosVisiveis, type ChamadoSolicitante } from "./SolicitantePainel";

function item(
  id: string,
  ambiente: ChamadoSolicitante["ambiente"],
  status: ChamadoSolicitante["status"] = "aberta",
): ChamadoSolicitante {
  return {
    id,
    titulo: id,
    status,
    prioridade: "media",
    criado_em: "2026-10-06T12:00:00Z",
    ambiente,
    sublocal: null,
    token_acompanhamento: id,
    local: null,
    propriedade: null,
  };
}

describe("chamadosDoAmbiente", () => {
  const lista = [
    item("ti1", "ti"),
    item("man1", "manutencao"),
    item("legado", null),
  ];

  it("separa TI e Manutenção", () => {
    expect(chamadosDoAmbiente(lista, "ti").map((c) => c.id)).toEqual(["ti1"]);
    expect(chamadosDoAmbiente(lista, "manutencao").map((c) => c.id)).toEqual([
      "man1",
      "legado",
    ]);
  });
});

describe("chamadosVisiveis", () => {
  const lista = [
    item("aberto", "ti", "aberta"),
    item("feito", "ti", "concluida"),
    item("cancelado", "ti", "cancelada"),
    item("manutencao", "manutencao", "concluida"),
  ];

  it("em aberto esconde concluído e cancelado", () => {
    expect(chamadosVisiveis(lista, "ti", false).map((c) => c.id)).toEqual([
      "aberto",
    ]);
  });

  it("histórico mostra só o que já fechou naquele ambiente", () => {
    expect(chamadosVisiveis(lista, "ti", true).map((c) => c.id)).toEqual([
      "feito",
      "cancelado",
    ]);
  });
});
