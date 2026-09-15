export function validarCriacaoProjeto(
  nome: string,
  membroIds: string[],
): string | null {
  if (!nome.trim()) return "Informe o nome do projeto.";
  if (membroIds.length < 1) {
    return "Inclua pelo menos uma pessoa no projeto.";
  }
  return null;
}

export function ehFilaNormal(projetoId: string | null | undefined) {
  return !projetoId;
}

export function filtrarQuadroProjetos<
  T extends { projeto_id?: string | null },
>(
  demandas: T[],
  visao: "fila" | "projetos",
  projetoFiltro = "",
): T[] {
  if (visao === "fila") {
    return demandas.filter((d) => ehFilaNormal(d.projeto_id));
  }
  return demandas.filter((d) => {
    if (ehFilaNormal(d.projeto_id)) return false;
    if (projetoFiltro && d.projeto_id !== projetoFiltro) return false;
    return true;
  });
}

/** Pessoas do filtro Colaborador na visão Projetos: só membros. */
export function colaboradoresDoFiltroProjeto<T extends { id: string }>(
  pessoas: T[],
  membrosPorProjeto: Record<string, string[]>,
  projetoFiltro: string,
  projetoIdsNoQuadro: string[],
): T[] {
  const ids = new Set<string>();
  const origens = projetoFiltro ? [projetoFiltro] : projetoIdsNoQuadro;
  for (const projetoId of origens) {
    for (const uid of membrosPorProjeto[projetoId] ?? []) ids.add(uid);
  }
  return pessoas.filter((p) => ids.has(p.id));
}

/** Select de projetos no quadro: cadastrados, mesmo sem demanda ainda. */
export function projetosDoFiltroQuadro(
  cadastrados: { id: string; nome: string }[],
  demandas: {
    projeto_id?: string | null;
    projeto?: { nome: string } | null;
  }[],
): { id: string; nome: string }[] {
  const vistos = new Map<string, string>();
  for (const p of cadastrados) vistos.set(p.id, p.nome);
  for (const d of demandas) {
    if (d.projeto_id && d.projeto?.nome && !vistos.has(d.projeto_id)) {
      vistos.set(d.projeto_id, d.projeto.nome);
    }
  }
  return [...vistos.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
}
