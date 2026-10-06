import { describe, expect, it } from "vitest";
import { chamadosDoAmbiente, type ChamadoSolicitante } from "./SolicitantePainel";

function item(
  id: string,
  ambiente: ChamadoSolicitante["ambiente"],
): ChamadoSolicitante {
  return {
    id,
    titulo: id,
    status: "aberta",
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
