import { describe, expect, it } from "vitest";
import { destinoAutenticado, rotaInicial, voltarAoPainel } from "./rotas";

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

  it("quem só tem Checklist entra direto nos checklists", () => {
    expect(
      destinoAutenticado("/", { role: "colaborador", ativo: true, ambientes: ["checklist"] }),
    ).toBe("/governanca");
    expect(rotaInicial("admin", ["checklist"])).toBe("/governanca");
  });

  it("com Checklist e chamados, o seletor decide; sem escolha vale o quadro", () => {
    const ambos = ["manutencao", "checklist"];
    expect(rotaInicial("lider", ambos)).toBe("/lider");
    expect(rotaInicial("lider", ambos, "checklist")).toBe("/governanca");
    expect(rotaInicial("lider", ["manutencao"], "checklist")).toBe("/lider");
  });

  it("não redireciona sem sessão ativa nem fora da entrada", () => {
    expect(destinoAutenticado("/", null)).toBeNull();
    expect(destinoAutenticado("/", { role: "lider", ativo: false })).toBeNull();
    expect(destinoAutenticado("/lider", lider)).toBeNull();
    expect(destinoAutenticado("/solicitar-login", lider)).toBeNull();
  });
});

describe("voltarAoPainel", () => {
  const tres = ["manutencao", "ti", "checklist"];

  it("volta para o painel que estava aberto", () => {
    expect(voltarAoPainel("admin", tres, "ti")).toMatchObject({
      href: "/lider",
      rotulo: "Voltar para TI",
    });
    expect(voltarAoPainel("admin", tres, "checklist")).toMatchObject({
      href: "/governanca",
      rotulo: "Voltar para Checklist",
    });
    expect(voltarAoPainel("admin", tres, "manutencao")).toMatchObject({
      href: "/lider",
      rotulo: "Voltar para Manutenção",
    });
  });

  it("líder só da manutenção sempre volta para a manutenção", () => {
    for (const cookie of [undefined, "ti", "checklist"]) {
      expect(voltarAoPainel("lider", ["manutencao"], cookie)).toMatchObject({
        href: "/lider",
        rotulo: "Voltar para Manutenção",
      });
    }
  });

  it("quem só tem checklist volta para o checklist", () => {
    expect(voltarAoPainel("colaborador", ["checklist"], undefined)).toMatchObject({
      href: "/governanca",
      rotulo: "Voltar para Checklist",
    });
  });

  it("colaborador volta para a fila dele", () => {
    expect(voltarAoPainel("colaborador", ["ti"], "ti")).toMatchObject({
      href: "/colaborador",
      ambiente: "ti",
    });
  });
});

describe("voltarAoPainel: área sugerida", () => {
  it("checklist sugere manutenção", () => {
    expect(voltarAoPainel("admin", ["manutencao", "ti", "checklist"], "checklist").ambiente).toBe(
      "manutencao",
    );
  });
});
