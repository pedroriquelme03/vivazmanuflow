import type { GovPapel } from "@/lib/governanca";

export type AcessoChecklist = "todos" | "equipe" | "admin";

export type ItemChecklist = {
  href: string;
  rotulo: string;
  acesso: AcessoChecklist;
};

/** Menu lateral do ambiente Checklist: Kanban é o penúltimo e Relatórios o último. */
export const MENU_CHECKLIST: ItemChecklist[] = [
  { href: "/governanca", rotulo: "Início", acesso: "todos" },
  { href: "/governanca/nova", rotulo: "Preencher checklist", acesso: "todos" },
  { href: "/governanca/admin/inspecoes", rotulo: "Inspeções", acesso: "equipe" },
  { href: "/governanca/admin/processos", rotulo: "Gerenciar checklists", acesso: "admin" },
  { href: "/governanca/admin/acomodacoes", rotulo: "Acomodações", acesso: "admin" },
  { href: "/governanca/admin/camareiras", rotulo: "Camareiras", acesso: "equipe" },
  { href: "/governanca/como-funciona", rotulo: "Como funciona", acesso: "todos" },
  { href: "/governanca/admin/kanban", rotulo: "Kanban", acesso: "equipe" },
  { href: "/governanca/admin/relatorios", rotulo: "Relatórios", acesso: "admin" },
];

export function podeAcessar(papel: GovPapel, acesso: AcessoChecklist) {
  if (acesso === "todos") return true;
  if (acesso === "equipe") return papel === "admin" || papel === "lider";
  return papel === "admin";
}

/** Itens do menu que o perfil da pessoa no checklist enxerga. */
export function menuChecklist(papel: GovPapel | null): ItemChecklist[] {
  if (!papel) return [];
  return MENU_CHECKLIST.filter((item) => podeAcessar(papel, item.acesso));
}

export function itemChecklistAtivo(href: string, caminho: string) {
  if (href === "/governanca") {
    return caminho === "/governanca" || caminho.startsWith("/governanca/inspecao/");
  }
  return caminho.startsWith(href);
}
