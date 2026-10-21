/** Helpers de edição da equipe (Cadastros) — validado em 11/09/2026. */

export type AmbienteEquipe = "manutencao" | "ti";

export type PerfilChecklist = "lider" | "camareira";

export const PERFIL_CHECKLIST_LABEL: Record<PerfilChecklist, string> = {
  lider: "Líder",
  camareira: "Aplicador",
};

export type DadosEdicaoEquipe = {
  nome: string;
  email: string;
  senha: string;
  senha2: string;
  ativo: boolean;
  propriedadeId: string;
  userId: string;
  role: "admin" | "lider" | "colaborador" | "solicitante";
  /** Ambientes de chamado marcados. */
  ambientes: readonly AmbienteEquipe[];
  avisos?: readonly AmbienteEquipe[];
  checklist?: boolean;
  perfilChecklist?: PerfilChecklist;
};

/** Solicitante só abre chamado; os demais podem ganhar o ambiente Checklist. */
export function usaChecklist(role: string) {
  return role !== "solicitante";
}

export function perfilChecklistInicial(governancaPapel: string | null | undefined): PerfilChecklist {
  return governancaPapel === "lider" ? "lider" : "camareira";
}

export function rotuloUltimaAlteracao(iso: string | null | undefined) {
  if (!iso) return "Ainda não houve alteração";
  return iso;
}

export function validarEdicaoEquipe(d: DadosEdicaoEquipe): string | null {
  if (!d.nome.trim()) return "Informe o nome.";
  if (!d.email.trim()) return "Informe o e-mail.";
  if (!d.email.includes("@")) return "Informe um e-mail válido.";
  if (d.senha || d.senha2) {
    if (d.senha !== d.senha2) return "As senhas não coincidem.";
    if (d.senha.trim().length < 6) {
      return "A senha deve ter no mínimo 6 caracteres.";
    }
  }
  const comChecklist = Boolean(d.checklist) && usaChecklist(d.role);
  if (d.ambientes.length === 0 && !comChecklist) {
    return usaChecklist(d.role)
      ? "Marque Manutenção, TI ou Checklist."
      : "Marque Manutenção, TI ou os dois.";
  }
  return null;
}

export function ambientesMarcados(
  manutencao: boolean,
  ti: boolean,
): AmbienteEquipe[] {
  const lista: AmbienteEquipe[] = [];
  if (manutencao) lista.push("manutencao");
  if (ti) lista.push("ti");
  return lista;
}

export function rotuloAmbientes(
  ambientes: readonly string[] | null | undefined,
) {
  const temTi = Boolean(ambientes?.includes("ti"));
  const temChecklist = Boolean(ambientes?.includes("checklist"));
  const temManutencao =
    !ambientes || ambientes.includes("manutencao") || (!temTi && !temChecklist);
  const nomes = [
    temManutencao ? "Manutenção" : null,
    temTi ? "TI" : null,
    temChecklist ? "Checklist" : null,
  ].filter((nome): nome is string => Boolean(nome));
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

export function payloadAtualizarUsuario(d: DadosEdicaoEquipe) {
  return {
    p_user_id: d.userId,
    p_nome: d.nome.trim(),
    p_email: d.email.trim(),
    p_ativo: d.ativo,
    p_propriedade_id: d.propriedadeId || null,
    p_senha: d.senha.trim() ? d.senha.trim() : undefined,
    p_role: d.role,
  };
}

export function payloadDefinirAmbientes(d: DadosEdicaoEquipe) {
  const comChecklist = Boolean(d.checklist) && usaChecklist(d.role);
  return {
    p_user_id: d.userId,
    p_ambientes: comChecklist ? [...d.ambientes, "checklist"] : [...d.ambientes],
  };
}

/** Perfil gravado no checklist. Admin não precisa: ele é o admin do checklist. */
export function payloadDefinirGovernanca(d: DadosEdicaoEquipe) {
  const comChecklist = Boolean(d.checklist) && usaChecklist(d.role);
  return {
    p_user_id: d.userId,
    p_papel: comChecklist && d.role !== "admin" ? (d.perfilChecklist ?? "camareira") : null,
  };
}

export function payloadDefinirAvisos(d: {
  userId: string;
  ambientes: readonly AmbienteEquipe[];
  avisos?: readonly AmbienteEquipe[];
}) {
  const escolhidos = (d.avisos ?? d.ambientes).filter((item) =>
    d.ambientes.includes(item),
  );
  return {
    p_user_id: d.userId,
    p_avisos: [...escolhidos],
  };
}

export function validarExclusaoConta(opts: {
  confirmacao: string;
  alvoId: string;
  meuId: string | null;
}) {
  if (opts.meuId && opts.alvoId === opts.meuId) {
    return "Você não pode apagar a própria conta.";
  }
  if (opts.confirmacao.trim().toUpperCase() !== "EXCLUIR") {
    return "Digite EXCLUIR para confirmar.";
  }
  return null;
}

export function mapaEmails(
  linhas: { id: string; email: string }[] | null | undefined,
) {
  return Object.fromEntries((linhas ?? []).map((e) => [e.id, e.email]));
}
