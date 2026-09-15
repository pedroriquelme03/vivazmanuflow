export function demandaApareceNasMinhas(
  d: {
    colaborador_id: string | null;
    status: string;
    arquivado?: boolean;
    projeto_id?: string | null;
  },
  colaboradorId: string,
): boolean {
  if (d.arquivado) return false;
  if (d.colaborador_id !== colaboradorId) return false;
  return d.status === "atribuida" || d.status === "em_andamento";
}

export function filasDoPainelColaborador<
  T extends { projeto_id?: string | null },
>(minhas: T[], abertas: T[]) {
  return {
    minhas,
    gerais: abertas.filter((d) => !d.projeto_id),
    projetosAbertas: abertas.filter((d) => Boolean(d.projeto_id)),
  };
}

export function aplicarPegarNoPainel<T extends { id: string }>(
  minhas: T[],
  abertas: T[],
  pega: T,
): { minhas: T[]; abertas: T[] } {
  return {
    abertas: abertas.filter((d) => d.id !== pega.id),
    minhas: minhas.some((d) => d.id === pega.id) ? minhas : [pega, ...minhas],
  };
}

export function aplicarReloadMinhas<T extends { id: string }>(
  atuais: T[],
  doServidor: T[] | null | undefined,
  recemPegaId: string | null,
  erro = false,
): T[] {
  if (erro || !doServidor) return atuais;
  if (recemPegaId && !doServidor.some((d) => d.id === recemPegaId)) {
    return atuais;
  }
  return doServidor;
}

export function demandaNoHistoricoColab(
  d: {
    status: string;
    arquivado?: boolean;
    concluido_em: string | null;
  },
  inicioMs: number,
): boolean {
  if (d.arquivado) return false;
  if (d.status === "aguardando_validacao") return true;
  if (d.status !== "concluida") return false;
  const quando = d.concluido_em ? new Date(d.concluido_em).getTime() : 0;
  return quando >= inicioMs;
}
