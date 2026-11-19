import { describe, expect, it } from "vitest";
import { MENU_CHECKLIST, hrefRelatorios, itemChecklistAtivo, menuChecklist, type AcessosSetor } from "./menu-checklist";
import { ehSetorGovernanca } from "./checklist-acessos";

const nada: AcessosSetor = { governanca: false, recreacao: false };
const rotulos = (papel: Parameters<typeof menuChecklist>[0], setor: AcessosSetor = nada) =>
  menuChecklist(papel, setor).map((i) => i.rotulo);

const item = (rotulo: string) => MENU_CHECKLIST.find((i) => i.rotulo === rotulo)!;

describe("menuChecklist", () => {
  it("admin vê tudo, de todos os setores", () => {
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

  it("líder de outro setor (ex.: Segurança da Aquamania) não vê o relatório diário da Governança nem Relatórios", () => {
    expect(rotulos("lider")).toEqual([
      "Início",
      "Preencher checklist",
      "Inspeções",
      "Kanban",
      "Gerenciar checklists",
      "Cadastros",
      "Como funciona",
    ]);
  });

  it("líder da Governança vê o relatório diário; líder da Recreação vê Relatórios", () => {
    expect(rotulos("lider", { governanca: true, recreacao: false })).toContain("Relatório diário");
    expect(rotulos("lider", { governanca: false, recreacao: true })).toContain("Relatórios");
    expect(rotulos("lider", { governanca: false, recreacao: true })).not.toContain("Relatório diário");
  });

  it("aplicador preenche; vê o relatório diário só se for da Governança", () => {
    expect(rotulos("camareira")).toEqual(["Início", "Preencher checklist", "Como funciona"]);
    expect(rotulos("camareira", { governanca: true, recreacao: false })).toEqual([
      "Início",
      "Preencher checklist",
      "Relatório diário",
      "Como funciona",
    ]);
    expect(rotulos(null)).toEqual([]);
  });

  it("Relatórios leva o admin aos indicadores e o líder da Recreação à aba dela", () => {
    expect(hrefRelatorios("admin")).toBe("/governanca/admin/relatorios");
    expect(hrefRelatorios("lider")).toBe("/governanca/recreacao");
  });

  it("Início fica marcado também no detalhe da inspeção", () => {
    expect(itemChecklistAtivo(item("Início"), "/governanca/inspecao/1")).toBe(true);
    expect(itemChecklistAtivo(item("Início"), "/governanca/nova")).toBe(false);
    expect(itemChecklistAtivo(item("Kanban"), "/governanca/admin/kanban")).toBe(true);
  });

  it("Cadastros fica marcado nas telas de dentro; Relatórios, no fechamento e na Recreação", () => {
    expect(itemChecklistAtivo(item("Cadastros"), "/governanca/admin/locais/abc")).toBe(true);
    expect(itemChecklistAtivo(item("Cadastros"), "/governanca/admin/equipe")).toBe(true);
    expect(itemChecklistAtivo(item("Cadastros"), "/governanca/admin/processos")).toBe(false);
    expect(itemChecklistAtivo(item("Relatórios"), "/governanca/admin/fechamento")).toBe(true);
    expect(itemChecklistAtivo(item("Relatórios"), "/governanca/recreacao")).toBe(true);
  });
});

describe("setor Governança", () => {
  it("reconhece o nome com e sem cedilha", () => {
    expect(ehSetorGovernanca("Governança")).toBe(true);
    expect(ehSetorGovernanca(" governanca ")).toBe(true);
    expect(ehSetorGovernanca("Lazer/Recreação")).toBe(false);
  });
});
