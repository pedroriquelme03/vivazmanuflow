/** Ambientes que recebem chamados. */
export type AmbienteEquipe = "manutencao" | "ti";

/** Painéis que a pessoa pode abrir: os de chamado e o de checklists. */
export type PainelEquipe = AmbienteEquipe | "checklist";

export const COOKIE_AMBIENTE = "vivaz-ambiente";

export const ROTULO_PAINEL: Record<PainelEquipe, string> = {
  manutencao: "Manutenção",
  ti: "TI",
  checklist: "Checklist",
};

/** O banco compartilhado ainda pode não ter a coluna nem a função. */
export function recursoAmbienteAusente(mensagem: string) {
  const texto = mensagem.toLowerCase();
  return (
    texto.includes("admin_definir_ambientes") ||
    texto.includes("admin_definir_avisos") ||
    texto.includes("marcar_ambiente_demanda") ||
    texto.includes("could not find the function") ||
    texto.includes("schema cache") ||
    (texto.includes("ambiente") &&
      (texto.includes("column") ||
        texto.includes("does not exist") ||
        texto.includes("não existe")))
  );
}

/**
 * Ambientes de chamado marcados. Cadastro antigo sem nada marcado fica na
 * manutenção; quem só tem Checklist não entra em nenhum quadro de chamados.
 */
export function listaAmbientes(
  valor: readonly string[] | null | undefined,
): AmbienteEquipe[] {
  const lista = (valor ?? []).filter(
    (item): item is AmbienteEquipe => item === "manutencao" || item === "ti",
  );
  const unicos = Array.from(new Set(lista));
  if (unicos.length > 0) return unicos;
  if ((valor ?? []).includes("checklist")) return [];
  return ["manutencao"];
}

export function temChecklist(valor: readonly string[] | null | undefined) {
  return (valor ?? []).includes("checklist");
}

/** Todos os painéis marcados, na ordem do seletor. */
export function paineisDoUsuario(
  valor: readonly string[] | null | undefined,
): PainelEquipe[] {
  const chamados: PainelEquipe[] = listaAmbientes(valor);
  return temChecklist(valor) ? [...chamados, "checklist"] : chamados;
}

export function pessoaDoAmbiente(
  ambientes: readonly string[] | null | undefined,
  ambiente: AmbienteEquipe,
) {
  return listaAmbientes(ambientes).includes(ambiente);
}

export function ambienteEscolhido(
  ambientes: readonly AmbienteEquipe[],
  cookie: string | undefined,
): AmbienteEquipe {
  if (ambientes.length === 0) return "manutencao";
  if (ambientes.length === 1) return ambientes[0];
  if (
    (cookie === "ti" || cookie === "manutencao") &&
    ambientes.includes(cookie)
  ) {
    return cookie;
  }
  return ambientes.includes("manutencao") ? "manutencao" : ambientes[0];
}

/** O cookie escolhe o painel quando ele está marcado; sem ele, vale o primeiro. */
export function painelEscolhido(
  paineis: readonly PainelEquipe[],
  cookie: string | undefined,
): PainelEquipe | null {
  if (paineis.length === 0) return null;
  const escolhido = paineis.find((p) => p === cookie);
  if (escolhido) return escolhido;
  return paineis.includes("manutencao") ? "manutencao" : paineis[0];
}

/** Líder, admin e colaborador seguem o que está marcado. Solicitante não usa esta lista. */
export function ambientesDoPapel(
  _role: string | null | undefined,
  valor: readonly string[] | null | undefined,
): AmbienteEquipe[] {
  return listaAmbientes(valor);
}
