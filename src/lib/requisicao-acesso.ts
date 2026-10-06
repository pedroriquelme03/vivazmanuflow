export function validarRequisicaoAcesso(d: {
  nome: string;
  email: string;
  setor: string;
  funcao: string;
}): string | null {
  if (!d.nome.trim()) return "Informe o nome.";
  if (!d.email.trim() || !d.email.includes("@")) {
    return "Informe um e-mail válido.";
  }
  if (!d.setor.trim()) return "Informe o setor.";
  if (!d.funcao.trim()) return "Informe a função.";
  return null;
}

export function recursoRequisicaoAusente(mensagem: string) {
  const texto = mensagem.toLowerCase();
  return (
    texto.includes("solicitar_acesso") ||
    texto.includes("requisicoes_acesso") ||
    texto.includes("could not find") ||
    texto.includes("schema cache")
  );
}

export function emailJaCadastrado(
  email: string,
  emails: Iterable<string | null | undefined>,
) {
  const alvo = email.trim().toLowerCase();
  if (!alvo) return false;
  for (const item of emails) {
    if ((item ?? "").trim().toLowerCase() === alvo) return true;
  }
  return false;
}
