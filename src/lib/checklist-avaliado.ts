/**
 * Quem é avaliado em cada checklist (configurado no checklist):
 *   * colaborador — o líder escolhe da lista (Governança: o líder avalia a camareira);
 *   * proprio     — quem aplica é o avaliado (aplica para si mesmo, com a conta dele);
 *   * escolher    — no começo, o líder diz se é para ele mesmo ou para outra pessoa;
 *                   o aplicador faz sempre para ele mesmo.
 * "Para mim" sempre usa a conta logada: ninguém escolhe o nome de outro (o banco confere).
 */

export type ModoAvaliado = "colaborador" | "proprio" | "escolher";

export const MODOS_AVALIADO: { valor: ModoAvaliado; rotulo: string; descricao: string }[] = [
  {
    valor: "colaborador",
    rotulo: "O líder escolhe o colaborador",
    descricao: "Quem aplica escolhe da lista quem foi avaliado (ex.: Governança avaliando a camareira).",
  },
  {
    valor: "proprio",
    rotulo: "Quem aplica é o avaliado",
    descricao: "A pessoa preenche para ela mesma, com a conta dela.",
  },
  {
    valor: "escolher",
    rotulo: "Perguntar no começo",
    descricao: "O líder escolhe: para ele mesmo ou para outra pessoa. O aplicador faz sempre para ele mesmo.",
  },
];

export function modoAvaliado(valor: string | null | undefined): ModoAvaliado {
  return valor === "proprio" || valor === "escolher" ? valor : "colaborador";
}

export function rotuloModoAvaliado(valor: string | null | undefined) {
  return MODOS_AVALIADO.find((m) => m.valor === modoAvaliado(valor))!.rotulo;
}

/**
 * O que o passo antes das perguntas mostra para esta pessoa:
 *   lista    — escolher o colaborador;
 *   proprio  — avisa que o checklist fica no nome dela;
 *   pergunta — "Para mim" ou "Para outra pessoa";
 *   nenhum   — não pergunta nada (aplicador num checklist em que o líder escolhe).
 */
export type PassoAvaliado = "lista" | "proprio" | "pergunta" | "nenhum";

export function passoAvaliado(modo: string | null | undefined, cuidaDoSetor: boolean): PassoAvaliado {
  switch (modoAvaliado(modo)) {
    case "proprio":
      return "proprio";
    case "escolher":
      return cuidaDoSetor ? "pergunta" : "proprio";
    default:
      return cuidaDoSetor ? "lista" : "nenhum";
  }
}

/** Pode começar? Na pergunta precisa responder; em "outra pessoa", escolher alguém da lista. */
export function avaliadoPronto(passo: PassoAvaliado, paraMim: boolean | null, escolhido: boolean, temLista: boolean) {
  if (passo === "pergunta") return paraMim === true || (paraMim === false && (escolhido || !temLista));
  if (passo === "lista") return escolhido || !temLista;
  return true;
}
