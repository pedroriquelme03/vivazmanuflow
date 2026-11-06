import { describe, expect, it } from "vitest";
import { itemChecklistAtivo, menuChecklist } from "./menu-checklist";

const rotulos = (papel: Parameters<typeof menuChecklist>[0]) =>
  menuChecklist(papel).map((i) => i.rotulo);

describe("menuChecklist", () => {
  it("admin vê tudo, com Kanban, Relatórios e Fechamento do mês no fim", () => {
    expect(rotulos("admin")).toEqual([
      "Início",
      "Preencher checklist",
      "Relatório diário",
      "Inspeções",
      "Gerenciar checklists",
      "Acomodações",
      "Camareiras",
      "Como funciona",
      "Kanban",
      "Relatórios",
    "Fechamento do mês",
    ]);
  });

  it("líder acompanha as inspeções, cadastra camareiras e vê o Kanban", () => {
    expect(rotulos("lider")).toEqual([
      "Início",
      "Preencher checklist",
      "Relatório diário",
      "Inspeções",
      "Camareiras",
      "Como funciona",
      "Kanban",
    ]);
  });

  it("aplicador preenche e vê o relatório diário", () => {
    expect(rotulos("camareira")).toEqual(["Início", "Preencher checklist", "Relatório diário", "Como funciona"]);
    expect(rotulos(null)).toEqual([]);
  });

  it("Início fica marcado também no detalhe da inspeção", () => {
    expect(itemChecklistAtivo("/governanca", "/governanca/inspecao/1")).toBe(true);
    expect(itemChecklistAtivo("/governanca", "/governanca/nova")).toBe(false);
    expect(itemChecklistAtivo("/governanca/admin/kanban", "/governanca/admin/kanban")).toBe(true);
  });
});
