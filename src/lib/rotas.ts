import type { Tables } from "@/lib/database.types";

type Papel = Tables<"usuarios">["role"];

/** Caminho inicial de cada papel. */
export function rotaInicial(role: Papel) {
  if (role === "colaborador") return "/colaborador";
  if (role === "solicitante") return "/solicitante";
  return "/lider";
}

const TELAS_DE_ENTRADA = new Set(["/", "/login"]);

/**
 * Se a pessoa já tem sessão e abriu a capa ou o login (inclusive pelo ícone
 * do app instalado), devolve o painel dela. Caso contrário, null.
 */
export function destinoAutenticado(
  path: string,
  perfil: { role: Papel; ativo: boolean } | null,
  next?: string | null,
): string | null {
  if (!TELAS_DE_ENTRADA.has(path) || !perfil?.ativo) return null;
  if (next && caminhoInterno(next)) return next;
  return rotaInicial(perfil.role);
}

function caminhoInterno(valor: string) {
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) {
    return false;
  }
  const caminho = valor.split(/[?#]/)[0] ?? valor;
  return !TELAS_DE_ENTRADA.has(caminho);
}
