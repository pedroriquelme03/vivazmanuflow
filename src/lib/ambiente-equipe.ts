export type AmbienteEquipe = "manutencao" | "ti";

export const COOKIE_AMBIENTE = "vivaz-ambiente";

/** O banco compartilhado ainda pode não ter a coluna nem a função. */
export function recursoAmbienteAusente(mensagem: string) {
  const texto = mensagem.toLowerCase();
  return (
    texto.includes("admin_definir_ambientes") ||
    texto.includes("marcar_ambiente_demanda") ||
    texto.includes("could not find the function") ||
    texto.includes("schema cache") ||
    (texto.includes("ambiente") &&
      (texto.includes("column") ||
        texto.includes("does not exist") ||
        texto.includes("não existe")))
  );
}

export function listaAmbientes(
  valor: readonly string[] | null | undefined,
): AmbienteEquipe[] {
  const lista = (valor ?? []).filter(
    (item): item is AmbienteEquipe => item === "manutencao" || item === "ti",
  );
  const unicos = Array.from(new Set(lista));
  if (unicos.length === 0) return ["manutencao"];
  return unicos;
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
  if (ambientes.length === 1) return ambientes[0];
  if (
    (cookie === "ti" || cookie === "manutencao") &&
    ambientes.includes(cookie)
  ) {
    return cookie;
  }
  return ambientes.includes("manutencao") ? "manutencao" : ambientes[0];
}

/** Líder opera só a Manutenção. Admin e colaborador seguem o que está marcado. */
export function ambientesDoPapel(
  role: string | null | undefined,
  valor: readonly string[] | null | undefined,
): AmbienteEquipe[] {
  if (role === "lider") return ["manutencao"];
  return listaAmbientes(valor);
}
