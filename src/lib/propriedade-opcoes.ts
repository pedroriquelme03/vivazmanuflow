/** Locais principais que podem ser escolhidos (cadastro, equipe, projetos…). */
export function propriedadesAtivas<T extends { id: string; ativo: boolean }>(
  lista: T[],
  manterId?: string | null,
): T[] {
  return lista.filter((p) => p.ativo || (manterId != null && p.id === manterId));
}

export function idPrimeiraPropriedadeAtiva<T extends { id: string; ativo: boolean }>(
  lista: T[],
) {
  return lista.find((p) => p.ativo)?.id ?? "";
}
