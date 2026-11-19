import type { GovPapel } from "@/lib/governanca";

export type AcessoChecklist = "todos" | "equipe" | "admin" | "governanca" | "relatorios";

/**
 * O que depende do setor da pessoa (calculado no servidor):
 *   - governanca: é do setor Governança (o relatório diário das UHs é só dele);
 *   - recreacao: vê as métricas da Recreação (líder do setor).
 * O admin vê tudo.
 */
export type AcessosSetor = { governanca: boolean; recreacao: boolean };
export const SEM_ACESSOS_SETOR: AcessosSetor = { governanca: false, recreacao: false };

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
 * fechamento do mês e a Recreação dentro.
 */
export const MENU_CHECKLIST: ItemChecklist[] = [
  { href: "/governanca", rotulo: "Início", acesso: "todos" },
  { href: "/governanca/nova", rotulo: "Preencher checklist", acesso: "todos" },
  { href: "/governanca/relatorio-diario", rotulo: "Relatório diário", acesso: "governanca" },
  { href: "/governanca/admin/inspecoes", rotulo: "Inspeções", acesso: "equipe" },
  { href: "/governanca/admin/kanban", rotulo: "Kanban", acesso: "equipe" },
  { href: "/governanca/admin/processos", rotulo: "Gerenciar checklists", acesso: "equipe" },
  { href: "/governanca/admin/cadastros", rotulo: "Cadastros", acesso: "equipe", inclui: ROTAS_CADASTROS },
  {
    href: "/governanca/admin/relatorios",
    rotulo: "Relatórios",
    acesso: "relatorios",
    inclui: ["/governanca/admin/fechamento", "/governanca/recreacao"],
  },
  { href: "/governanca/como-funciona", rotulo: "Como funciona", acesso: "todos" },
];

export function podeAcessar(papel: GovPapel, acesso: AcessoChecklist, setor: AcessosSetor = SEM_ACESSOS_SETOR) {
  if (acesso === "todos") return true;
  if (papel === "admin") return true;
  if (acesso === "equipe") return papel === "lider";
  if (acesso === "governanca") return setor.governanca;
  if (acesso === "relatorios") return setor.recreacao;
  return false;
}

/** Itens do menu que o perfil da pessoa no checklist enxerga. */
export function menuChecklist(papel: GovPapel | null, setor: AcessosSetor = SEM_ACESSOS_SETOR): ItemChecklist[] {
  if (!papel) return [];
  return MENU_CHECKLIST.filter((item) => podeAcessar(papel, item.acesso, setor));
}

/** Para onde leva "Relatórios": o admin vê os indicadores; o líder da Recreação, a aba dela. */
export function hrefRelatorios(papel: GovPapel | null) {
  return papel === "admin" ? "/governanca/admin/relatorios" : "/governanca/recreacao";
}

export function itemChecklistAtivo(item: Pick<ItemChecklist, "href" | "inclui">, caminho: string) {
  if (item.href === "/governanca") {
    return caminho === "/governanca" || caminho.startsWith("/governanca/inspecao/");
  }
  return [item.href, ...(item.inclui ?? [])].some((rota) => caminho.startsWith(rota));
}
