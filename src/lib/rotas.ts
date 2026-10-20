import type { Tables } from "@/lib/database.types";
import { painelEscolhido, paineisDoUsuario } from "@/lib/ambiente-equipe";

type Papel = Tables<"usuarios">["role"];

export const ROTA_CHECKLIST = "/governanca";

/**
 * Caminho inicial de cada papel. Com os ambientes, quem só tem Checklist (ou
 * deixou o checklist escolhido no seletor) entra direto nos checklists.
 */
export function rotaInicial(
  role: Papel,
  ambientes?: readonly string[] | null,
  painelCookie?: string,
) {
  if (role === "solicitante") return "/solicitante";
  if (ambientes !== undefined) {
    const painel = painelEscolhido(paineisDoUsuario(ambientes), painelCookie);
    if (painel === "checklist") return ROTA_CHECKLIST;
  }
  if (role === "colaborador") return "/colaborador";
  return "/lider";
}

const TELAS_DE_ENTRADA = new Set(["/", "/login"]);

/**
 * Se a pessoa já tem sessão e abriu a capa ou o login (inclusive pelo ícone
 * do app instalado), devolve o painel dela. Caso contrário, null.
 */
export function destinoAutenticado(
  path: string,
  perfil: { role: Papel; ativo: boolean; ambientes?: readonly string[] | null } | null,
  next?: string | null,
  painelCookie?: string,
): string | null {
  if (!TELAS_DE_ENTRADA.has(path) || !perfil?.ativo) return null;
  if (next && caminhoInterno(next)) return next;
  return rotaInicial(perfil.role, perfil.ambientes, painelCookie);
}

function caminhoInterno(valor: string) {
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) {
    return false;
  }
  const caminho = valor.split(/[?#]/)[0] ?? valor;
  return !TELAS_DE_ENTRADA.has(caminho);
}
