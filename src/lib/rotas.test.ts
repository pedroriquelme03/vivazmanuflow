import { describe, expect, it } from "vitest";
import { destinoAutenticado, rotaInicial } from "./rotas";

const lider = { role: "lider" as const, ativo: true };

describe("destinoAutenticado", () => {
  it("manda cada papel para o próprio painel", () => {
    expect(destinoAutenticado("/", { role: "colaborador", ativo: true })).toBe(
      "/colaborador",
    );
    expect(destinoAutenticado("/", { role: "solicitante", ativo: true })).toBe(
      "/solicitante",
    );
    expect(destinoAutenticado("/", lider)).toBe("/lider");
    expect(destinoAutenticado("/", { role: "admin", ativo: true })).toBe(
      rotaInicial("admin"),
    );
  });

  it("também pula a tela de login", () => {
    expect(destinoAutenticado("/login", lider)).toBe("/lider");
  });

  it("respeita o next interno", () => {
    expect(destinoAutenticado("/login", lider, "/admin/eventos")).toBe(
      "/admin/eventos",
    );
    expect(destinoAutenticado("/login", lider, "/lider/preventivas?aba=1")).toBe(
      "/lider/preventivas?aba=1",
    );
  });

  it("ignora next externo ou que volta para a entrada", () => {
    expect(destinoAutenticado("/login", lider, "//evil.com")).toBe("/lider");
    expect(destinoAutenticado("/login", lider, "/\\evil")).toBe("/lider");
    expect(destinoAutenticado("/login", lider, "/login")).toBe("/lider");
    expect(destinoAutenticado("/login", lider, "/")).toBe("/lider");
    expect(destinoAutenticado("/login", lider, "https://evil.com")).toBe(
      "/lider",
    );
  });

  it("não redireciona sem sessão ativa nem fora da entrada", () => {
    expect(destinoAutenticado("/", null)).toBeNull();
    expect(destinoAutenticado("/", { role: "lider", ativo: false })).toBeNull();
    expect(destinoAutenticado("/lider", lider)).toBeNull();
    expect(destinoAutenticado("/solicitar-login", lider)).toBeNull();
  });
});
