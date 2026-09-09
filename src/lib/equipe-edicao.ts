export type DadosEdicaoEquipe = {
  nome: string;
  email: string;
  senha: string;
  senha2: string;
  ativo: boolean;
  propriedadeId: string;
  userId: string;
};

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
  return null;
}

export function payloadAtualizarUsuario(d: DadosEdicaoEquipe) {
  return {
    p_user_id: d.userId,
    p_nome: d.nome.trim(),
    p_email: d.email.trim(),
    p_ativo: d.ativo,
    p_propriedade_id: d.propriedadeId || null,
    p_senha: d.senha.trim() ? d.senha.trim() : undefined,
  };
}

export function mapaEmails(
  linhas: { id: string; email: string }[] | null | undefined,
) {
  return Object.fromEntries((linhas ?? []).map((e) => [e.id, e.email]));
}
