import type { GovPapel } from "@/lib/governanca";

export type AcessoChecklist = "todos" | "equipe" | "admin";

export type ItemChecklist = {
  href: string;
  rotulo: string;
  acesso: AcessoChecklist;
  /** Telas que ficam dentro deste item e o deixam marcado no menu. */
  inclui?: string[];
};

/** Rotas que ficam dentro da tela Cadastros. */
export const ROTAS_CADASTROS = [
  "/governanca/admin/equipe",
  "/governanca/admin/colaboradores",
  "/governanca/admin/setores",
  "/governanca/admin/locais",
];

/**
 * Menu lateral do ambiente Checklist, enxuto: o dia a dia em cima; cadastros
 * (equipe, colaboradores, setores, locais) numa tela só; relatórios com o
 * fechamento do mês dentro.
 */
export const MENU_CHECKLIST: ItemChecklist[] = [
  { href: "/governanca", rotulo: "Início", acesso: "todos" },
  { href: "/governanca/nova", rotulo: "Preencher checklist", acesso: "todos" },
  { href: "/governanca/relatorio-diario", rotulo: "Relatório diário", acesso: "todos" },
  { href: "/governanca/admin/inspecoes", rotulo: "Inspeções", acesso: "equipe" },
  { href: "/governanca/admin/kanban", rotulo: "Kanban", acesso: "equipe" },
  { href: "/governanca/admin/processos", rotulo: "Gerenciar checklists", acesso: "equipe" },
  { href: "/governanca/admin/cadastros", rotulo: "Cadastros", acesso: "equipe", inclui: ROTAS_CADASTROS },
  {
    href: "/governanca/admin/relatorios",
    rotulo: "Relatórios",
    acesso: "admin",
    inclui: ["/governanca/admin/fechamento"],
  },
  { href: "/governanca/como-funciona", rotulo: "Como funciona", acesso: "todos" },
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

export function itemChecklistAtivo(item: Pick<ItemChecklist, "href" | "inclui">, caminho: string) {
  if (item.href === "/governanca") {
    return caminho === "/governanca" || caminho.startsWith("/governanca/inspecao/");
  }
  return [item.href, ...(item.inclui ?? [])].some((rota) => caminho.startsWith(rota));
}
