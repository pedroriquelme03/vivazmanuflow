export const URL_LOGIN_VIVAZ = "https://vivazmanuflow.vercel.app/";
export const ASSUNTO_ACESSO =
  "Acesso ao sistema de chamados do Vivaz Cataratas";

export type DadosAcessoEmail = {
  nome: string;
  email: string;
  senha: string;
  papel?: string;
  urlLogin?: string;
};

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome.trim();
}

export function rascunhoAcessoOutlook(d: DadosAcessoEmail) {
  const para = d.email.trim();
  const saudacao = primeiroNome(d.nome) || "olá";
  const papel = d.papel?.trim() || "Solicitante";
  const url = (d.urlLogin ?? URL_LOGIN_VIVAZ).trim();
  const corpo = [
    `Olá, ${saudacao}!`,
    "",
    "Seu acesso ao Sistema de Chamados do Vivaz Cataratas Hotel Resort foi criado com sucesso.",
    "",
    "A partir de agora, você poderá acessar a plataforma para registrar e acompanhar suas solicitações.",
    "",
    "Dados de acesso:",
    "",
    `Perfil: ${papel}`,
    `E-mail de acesso: ${para}`,
    `Senha inicial: ${d.senha}`,
    "",
    "Acesse o sistema pelo link abaixo:",
    url,
    "",
    "Se tiver qualquer dificuldade para acessar a plataforma, responda a este e-mail para que possamos auxiliá-lo.",
    "",
    "Atenciosamente,",
    "Equipe Vivaz Cataratas Hotel Resort",
  ].join("\r\n");

  const href = `mailto:${encodeURIComponent(para)}?subject=${encodeURIComponent(ASSUNTO_ACESSO)}&body=${encodeURIComponent(corpo)}`;
  return { href, assunto: ASSUNTO_ACESSO, corpo, para };
}

export function abrirRascunhoEmail(href: string) {
  window.location.href = href;
}
