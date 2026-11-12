import { describe, expect, it } from "vitest";
import { MENU_CHECKLIST, itemChecklistAtivo, menuChecklist } from "./menu-checklist";

const rotulos = (papel: Parameters<typeof menuChecklist>[0]) =>
  menuChecklist(papel).map((i) => i.rotulo);

const item = (rotulo: string) => MENU_CHECKLIST.find((i) => i.rotulo === rotulo)!;

describe("menuChecklist", () => {
  it("admin vê tudo, com cadastros numa tela só e o fechamento dentro de Relatórios", () => {
    expect(rotulos("admin")).toEqual([
      "Início",
      "Preencher checklist",
      "Relatório diário",
      "Inspeções",
      "Kanban",
      "Gerenciar checklists",
      "Cadastros",
      "Relatórios",
      "Como funciona",
    ]);
  });

  it("líder acompanha as inspeções e o Kanban, edita os checklists e cadastra no setor", () => {
    expect(rotulos("lider")).toEqual([
      "Início",
      "Preencher checklist",
      "Relatório diário",
      "Inspeções",
      "Kanban",
      "Gerenciar checklists",
      "Cadastros",
      "Como funciona",
    ]);
  });

  it("aplicador preenche e vê o relatório diário", () => {
    expect(rotulos("camareira")).toEqual(["Início", "Preencher checklist", "Relatório diário", "Como funciona"]);
    expect(rotulos(null)).toEqual([]);
  });

  it("Início fica marcado também no detalhe da inspeção", () => {
    expect(itemChecklistAtivo(item("Início"), "/governanca/inspecao/1")).toBe(true);
    expect(itemChecklistAtivo(item("Início"), "/governanca/nova")).toBe(false);
    expect(itemChecklistAtivo(item("Kanban"), "/governanca/admin/kanban")).toBe(true);
  });

  it("Cadastros fica marcado nas telas de dentro; Relatórios, no fechamento", () => {
    expect(itemChecklistAtivo(item("Cadastros"), "/governanca/admin/locais/abc")).toBe(true);
    expect(itemChecklistAtivo(item("Cadastros"), "/governanca/admin/equipe")).toBe(true);
    expect(itemChecklistAtivo(item("Cadastros"), "/governanca/admin/processos")).toBe(false);
    expect(itemChecklistAtivo(item("Relatórios"), "/governanca/admin/fechamento")).toBe(true);
  });
});
