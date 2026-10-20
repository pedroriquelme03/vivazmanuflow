import { describe, expect, it } from "vitest";
import { itemChecklistAtivo, menuChecklist } from "./menu-checklist";

const rotulos = (papel: Parameters<typeof menuChecklist>[0]) =>
  menuChecklist(papel).map((i) => i.rotulo);

describe("menuChecklist", () => {
  it("admin vê tudo, com Kanban penúltimo e Relatórios por último", () => {
    expect(rotulos("admin")).toEqual([
      "Início",
      "Preencher checklist",
      "Inspeções",
      "Gerenciar checklists",
      "Acomodações",
      "Camareiras",
      "Como funciona",
      "Kanban",
      "Relatórios",
    ]);
  });

  it("líder acompanha as inspeções e o Kanban", () => {
    expect(rotulos("lider")).toEqual([
      "Início",
      "Preencher checklist",
      "Inspeções",
      "Como funciona",
      "Kanban",
    ]);
  });

  it("aplicador só preenche", () => {
    expect(rotulos("camareira")).toEqual(["Início", "Preencher checklist", "Como funciona"]);
    expect(rotulos(null)).toEqual([]);
  });

  it("Início fica marcado também no detalhe da inspeção", () => {
    expect(itemChecklistAtivo("/governanca", "/governanca/inspecao/1")).toBe(true);
    expect(itemChecklistAtivo("/governanca", "/governanca/nova")).toBe(false);
    expect(itemChecklistAtivo("/governanca/admin/kanban", "/governanca/admin/kanban")).toBe(true);
  });
});
