import { describe, expect, it } from "vitest";
import { validarConclusaoAdmin } from "@/lib/demanda-gestor";

describe("validarConclusaoAdmin", () => {
  it("exige motivo", () => {
    expect(validarConclusaoAdmin("   ", "aberta")).toBe(
      "Informe o motivo da conclusão.",
    );
  });

  it("aceita aberta, atribuída e em andamento", () => {
    expect(validarConclusaoAdmin("Fechada pelo admin", "aberta")).toBeNull();
    expect(validarConclusaoAdmin("Fechada pelo admin", "atribuida")).toBeNull();
    expect(
      validarConclusaoAdmin("Fechada pelo admin", "em_andamento"),
    ).toBeNull();
  });

  it("recusa outros status", () => {
    expect(
      validarConclusaoAdmin("ok", "aguardando_validacao"),
    ).toBe(
      "Só é possível concluir demandas abertas, atribuídas ou em andamento.",
    );
    expect(validarConclusaoAdmin("ok", "concluida")).toBe(
      "Só é possível concluir demandas abertas, atribuídas ou em andamento.",
    );
  });

  it("recusa arquivada", () => {
    expect(validarConclusaoAdmin("ok", "aberta", true)).toBe(
      "Desarquive a demanda antes de concluir.",
    );
  });
});
