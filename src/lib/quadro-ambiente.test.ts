import { describe, expect, it } from "vitest";
import { inicioPeriodo, termoBuscaSeguro } from "./quadro-ambiente";

describe("inicioPeriodo", () => {
  const agora = new Date(2026, 9, 26, 15, 30);

  it("hoje começa à meia-noite local", () => {
    expect(inicioPeriodo("hoje", agora)).toBe(
      new Date(2026, 9, 26, 0, 0).toISOString(),
    );
  });

  it("7 dias inclui hoje e os 6 anteriores", () => {
    expect(inicioPeriodo("7dias", agora)).toBe(
      new Date(2026, 9, 20, 0, 0).toISOString(),
    );
  });

  it("30 dias atravessa o mês", () => {
    expect(inicioPeriodo("30dias", agora)).toBe(
      new Date(2026, 8, 27, 0, 0).toISOString(),
    );
  });

  it("tudo não tem limite", () => {
    expect(inicioPeriodo("tudo", agora)).toBeNull();
  });
});

describe("termoBuscaSeguro", () => {
  it("tira o que quebra o filtro do Supabase", () => {
    expect(termoBuscaSeguro(" ar (quarto 204), 50%* ")).toBe(
      "ar  quarto 204   50",
    );
  });
});
