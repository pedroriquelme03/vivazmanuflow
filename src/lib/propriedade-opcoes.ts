/** Itens que podem ser escolhidos: os ativos e, se houver, o que já está escolhido. */
export function ativosOuAtual<T extends { id: string; ativo: boolean }>(
  lista: readonly T[],
  manterId?: string | null,
): T[] {
  return lista.filter((p) => p.ativo || (manterId != null && p.id === manterId));
}

/** Locais principais que podem ser escolhidos (cadastro, equipe, projetos…). */
export const propriedadesAtivas = ativosOuAtual;

export function idPrimeiraPropriedadeAtiva<T extends { id: string; ativo: boolean }>(
  lista: T[],
) {
  return lista.find((p) => p.ativo)?.id ?? "";
}
