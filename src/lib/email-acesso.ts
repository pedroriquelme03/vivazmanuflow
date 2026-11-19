export const URL_LOGIN_VIVAZ = "https://vivazmanuflow.vercel.app/";
export const ASSUNTO_ACESSO =
  "Acesso ao sistema de chamados do Vivaz Cataratas";

export const EMPRESA_PADRAO = "Vivaz Cataratas Hotel Resort";

export type DadosAcessoEmail = {
  nome: string;
  email: string;
  senha: string;
  papel?: string;
  urlLogin?: string;
  /** Qual sistema: Manutenção e TI usam o padrão; o Checklist manda "checklist". */
  sistema?: "chamados" | "checklist";
  /** Empresa do acesso (ex.: "Aquamania"). Padrão: Vivaz Cataratas Hotel Resort. */
  empresa?: string;
};

/** "Vivaz Cataratas" vira o nome completo do hotel; as outras propriedades ficam como estão. */
export function empresaDaPropriedade(nome: string) {
  const limpo = nome.trim();
  return /^vivaz cataratas$/i.test(limpo) ? EMPRESA_PADRAO : limpo;
}

/** Empresas das propriedades marcadas, sem repetir: "Aquamania" ou "Vivaz Cataratas Hotel Resort e Aquamania". */
export function empresaDosAcessos(propriedades: string[]) {
  const nomes = [...new Set(propriedades.map(empresaDaPropriedade).filter(Boolean))];
  return nomes.length ? nomes.join(" e ") : EMPRESA_PADRAO;
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome.trim();
}

export function rascunhoAcessoOutlook(d: DadosAcessoEmail) {
  const para = d.email.trim();
  const saudacao = primeiroNome(d.nome) || "olá";
  const papel = d.papel?.trim() || "Solicitante";
  const url = (d.urlLogin ?? URL_LOGIN_VIVAZ).trim();
  const empresa = d.empresa?.trim() || EMPRESA_PADRAO;
  const checklist = d.sistema === "checklist";
  const assunto = checklist ? `Acesso ao Checklist do ${empresa}` : ASSUNTO_ACESSO;
  const corpo = [
    `Olá, ${saudacao}!`,
    "",
    checklist
      ? `Seu acesso ao Checklist do ${empresa} foi criado com sucesso.`
      : `Seu acesso ao Sistema de Chamados do ${empresa} foi criado com sucesso.`,
    "",
    checklist
      ? "A partir de agora, você poderá acessar a plataforma para preencher e acompanhar os checklists do seu setor."
      : "A partir de agora, você poderá acessar a plataforma para registrar e acompanhar suas solicitações.",
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
    `Equipe ${empresa}`,
  ].join("\r\n");

  const href = `mailto:${encodeURIComponent(para)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  return { href, assunto, corpo, para };
}

export function abrirRascunhoEmail(href: string) {
  window.location.href = href;
}
