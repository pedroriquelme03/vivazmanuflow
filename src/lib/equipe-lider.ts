/**
 * Cadastros da Manutenção e da TI pelo líder: cada líder cuida só do próprio
 * sistema. Ele cadastra e edita colaboradores e solicitantes do(s) sistema(s)
 * dele; não cria nem edita administrador nem outro líder, e não mexe no
 * Checklist (que é do líder do checklist). Os pedidos de acesso (Solicitações)
 * ficam só com a TI. O administrador continua vendo e mexendo em tudo.
 */

export type SistemaEquipe = "manutencao" | "ti";

export const PAPEIS_DO_LIDER = ["colaborador", "solicitante"] as const;
export type PapelDoLider = (typeof PAPEIS_DO_LIDER)[number];

const SISTEMAS: SistemaEquipe[] = ["manutencao", "ti"];

/** Sistemas que o líder cuida: os ambientes dele que são Manutenção ou TI. */
export function sistemasDoLider(ambientes: readonly string[] | null | undefined): SistemaEquipe[] {
  return SISTEMAS.filter((s) => (ambientes ?? []).includes(s));
}

/** Abas de Cadastros: o admin vê todas; o líder, a Equipe e (se for da TI) as Solicitações. */
export function abasDoLider(sistemas: readonly SistemaEquipe[]) {
  return sistemas.includes("ti") ? (["Equipe", "Solicitações"] as const) : (["Equipe"] as const);
}

/**
 * A pessoa é do sistema do líder? Colaborador: todos os ambientes dele (fora o
 * Checklist) estão nos sistemas do líder. Solicitante: abre chamado nos dois,
 * então qualquer líder de Manutenção ou TI cuida. Admin e líder, nunca.
 */
export function pessoaDoSistema(
  alvo: { role: string; ambientes: readonly string[] | null },
  sistemas: readonly SistemaEquipe[],
) {
  if (sistemas.length === 0) return false;
  if (alvo.role === "solicitante") return true;
  if (alvo.role !== "colaborador") return false;
  const dele = (alvo.ambientes ?? []).filter((a) => a !== "checklist");
  return dele.length > 0 && dele.every((a) => sistemas.includes(a as SistemaEquipe));
}

/**
 * Ambientes depois da edição pelo líder: troca só os do sistema dele e mantém
 * o resto (o Checklist, por exemplo) como estava.
 */
export function ambientesFinais(
  atuais: readonly string[] | null,
  escolhidos: readonly string[],
  sistemas: readonly SistemaEquipe[],
) {
  const fora = (atuais ?? []).filter((a) => !sistemas.includes(a as SistemaEquipe));
  const dentro = escolhidos.filter((a) => sistemas.includes(a as SistemaEquipe));
  return [...new Set([...dentro, ...fora])];
}

export type CadastroLider = {
  nome: string;
  email: string;
  senha: string;
  role: string;
  /** Sistemas marcados (para solicitante vale sempre os dois). */
  ambientes: string[];
  propriedadeId: string;
};

export function validarCadastroLider(dados: CadastroLider, sistemas: readonly SistemaEquipe[], novo: boolean) {
  if (!dados.nome.trim()) return "Informe o nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) return "Informe um e-mail válido.";
  if (novo ? dados.senha.length < 6 : dados.senha && dados.senha.length < 6) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (!(PAPEIS_DO_LIDER as readonly string[]).includes(dados.role)) {
    return "O líder cadastra só colaborador ou solicitante. Líder e administrador quem cria é o administrador.";
  }
  if (dados.role === "colaborador") {
    const marcados = dados.ambientes.filter((a) => a !== "checklist");
    if (marcados.length === 0) return "Marque o sistema da pessoa.";
    if (marcados.some((a) => !sistemas.includes(a as SistemaEquipe))) return "Você só cadastra gente do seu sistema.";
  }
  return null;
}

/** Solicitante abre chamado na Manutenção e na TI; colaborador fica com o que foi marcado. */
export function ambientesDoCadastro(dados: Pick<CadastroLider, "role" | "ambientes">): SistemaEquipe[] {
  if (dados.role === "solicitante") return [...SISTEMAS];
  return SISTEMAS.filter((s) => dados.ambientes.includes(s));
}
