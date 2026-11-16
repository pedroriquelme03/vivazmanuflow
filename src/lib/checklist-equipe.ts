/**
 * Equipe do checklist: quem entra com login (líder e aplicador). Regra do
 * cadastro: cada líder mexe só no próprio sistema. O líder do checklist cria
 * gente só para o Checklist e dá acesso só aos setores dele; login, senha e
 * situação ele muda só de quem é só do Checklist. O administrador mexe em tudo,
 * e só ele cria administrador (em Cadastros > Equipe).
 */

export type PerfilEquipeChecklist = "camareira" | "lider";

export const PERFIS_EQUIPE: { valor: PerfilEquipeChecklist; rotulo: string; descricao: string }[] = [
  { valor: "camareira", rotulo: "Aplicador", descricao: "preenche os checklists e vê o que preencheu" },
  { valor: "lider", rotulo: "Líder", descricao: "acompanha tudo do setor, edita checklists e cadastra" },
];

export type MembroEquipe = {
  id: string;
  nome: string;
  email: string | null;
  /** admin, lider ou camareira (aplicador). */
  papel: string;
  ambientes: string[];
  ativo: boolean;
  setores: string[];
};

export type NovoMembro = {
  nome: string;
  email: string;
  senha: string;
  perfil: PerfilEquipeChecklist;
  setores: string[];
};

export type EdicaoMembro = {
  id: string;
  perfil: PerfilEquipeChecklist;
  ativo: boolean;
  /** Vazio mantém a senha atual. */
  senha: string;
  setores: string[];
};

export function rotuloPapelEquipe(papel: string) {
  if (papel === "admin") return "Administrador";
  return PERFIS_EQUIPE.find((p) => p.valor === papel)?.rotulo ?? "Aplicador";
}

/** Ambientes além do Checklist, para avisar que a pessoa também usa outro painel. */
export function outrosAmbientes(ambientes: readonly string[]) {
  const nomes: Record<string, string> = { manutencao: "Manutenção", ti: "TI" };
  return ambientes.filter((a) => a !== "checklist").map((a) => nomes[a] ?? a);
}

/** Usa só o Checklist: o login dela é do sistema do líder do checklist. */
export function soDoChecklist(membro: Pick<MembroEquipe, "ambientes" | "papel">) {
  return membro.papel !== "admin" && outrosAmbientes(membro.ambientes).length === 0;
}

/** Mesmo formato que o Supabase aceita; o resto da validação fica com ele. */
export function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Confere o cadastro antes de criar o login. `permitidos` são os setores que
 * quem cadastra pode dar (o líder, os dele; o admin, todos). Devolve o erro ou null.
 */
export function validarNovoMembro(dados: NovoMembro, permitidos: readonly string[]) {
  if (!dados.nome.trim()) return "Informe o nome.";
  if (!emailValido(dados.email)) return "Informe um e-mail válido.";
  if (dados.senha.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
  if (!PERFIS_EQUIPE.some((p) => p.valor === dados.perfil)) return "Escolha Aplicador ou Líder.";
  if (dados.setores.length === 0) return "Marque pelo menos um setor.";
  if (dados.setores.some((s) => !permitidos.includes(s))) return "Você só pode dar acesso aos seus setores.";
  return null;
}

/** Quem cadastra pode abrir a edição desta pessoa? Ninguém edita a si mesmo nem o admin por aqui. */
export function podeMexerNoAcesso(membro: Pick<MembroEquipe, "id" | "papel">, euId: string) {
  return membro.id !== euId && membro.papel !== "admin";
}

export type QuemEdita = { ehAdmin: boolean; setores: readonly string[] };

/**
 * O líder só cuida de aplicador que está inteiro nos setores dele: não mexe em
 * outro líder nem em quem também é de setor que não é dele.
 */
function liderCuida(membro: Pick<MembroEquipe, "papel" | "setores">, setores: readonly string[]) {
  return membro.papel === "camareira" && membro.setores.length > 0 && membro.setores.every((s) => setores.includes(s));
}

/**
 * Login, senha e situação mudam aqui só de quem é só do Checklist (quem também
 * usa Manutenção/TI muda em Cadastros > Equipe de lá, para não derrubar o login
 * nos outros painéis). O líder, além disso, só de aplicador dos setores dele.
 */
export function podeMudarLogin(membro: Pick<MembroEquipe, "ambientes" | "papel" | "setores">, eu: QuemEdita) {
  return soDoChecklist(membro) && (eu.ehAdmin || liderCuida(membro, eu.setores));
}

/** Perfil (Aplicador/Líder): o admin muda de qualquer um menos admin; o líder, só de aplicador dos setores dele. */
export function podeMudarPerfil(membro: Pick<MembroEquipe, "ambientes" | "papel" | "setores">, eu: QuemEdita) {
  if (membro.papel === "admin") return false;
  return eu.ehAdmin || (soDoChecklist(membro) && liderCuida(membro, eu.setores));
}

/**
 * O que gravar nos setores: só mexe nos `permitidos` (os de quem edita), e o
 * resto da pessoa fica como estava.
 */
export function mudancaDeSetores(atuais: readonly string[], desejados: readonly string[], permitidos: readonly string[]) {
  const pode = new Set(permitidos);
  return {
    inserir: desejados.filter((s) => pode.has(s) && !atuais.includes(s)),
    remover: atuais.filter((s) => pode.has(s) && !desejados.includes(s)),
  };
}

export function validarEdicaoMembro(dados: EdicaoMembro) {
  if (dados.senha && dados.senha.length < 6) return "A senha nova precisa ter pelo menos 6 caracteres.";
  if (!PERFIS_EQUIPE.some((p) => p.valor === dados.perfil)) return "Escolha Aplicador ou Líder.";
  return null;
}
