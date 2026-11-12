/**
 * Regras do checklist que dependem da resposta (padrão do Checklist Fácil):
 *   * condicionais: uma resposta mostra outra pergunta ou uma seção inteira;
 *   * complementos obrigatórios: certa resposta exige comentário e/ou foto;
 *   * nota com peso: cada pergunta Sim/Não vale o seu peso.
 * Sem dependência de outros módulos: recebe só o tipo e a resposta.
 */

export type Complemento = "comentario" | "foto";
export const COMPLEMENTOS: { valor: Complemento; rotulo: string }[] = [
  { valor: "comentario", rotulo: "Comentário" },
  { valor: "foto", rotulo: "Foto" },
];

/** Por resposta ("sim", "nao", carinha ou texto da opção), o que passa a ser obrigatório. */
export type Exige = Record<string, Complemento[]>;

export type Dependencia = {
  id: string;
  pergunta_id: string;
  /** Resposta que dispara: "sim", "nao", a carinha ou o texto da opção. */
  gatilho: string;
  filho_pergunta_id: string | null;
  filho_secao_id: string | null;
};

type Resposta = {
  resposta?: string | null;
  valor?: string;
  selecionadas?: string[];
  comentario?: string;
  anexoPreview?: string | null;
  anexoFile?: unknown;
};

/** As respostas que a pessoa deu, no formato das chaves de `exige` e dos gatilhos. */
export function respostasDadas(tipo: string, r: Resposta | undefined): string[] {
  if (!r || r.resposta === "na") return [];
  if (tipo === "sim_nao") return r.resposta === "sim" || r.resposta === "nao" ? [r.resposta] : [];
  if (tipo === "selecao_multipla") return r.selecionadas ?? [];
  if (tipo === "carinhas" || tipo === "selecao_unica") return r.valor ? [r.valor] : [];
  return [];
}

/** A resposta em texto curto, para mostrar como identificação ("Natal", "Sim", "A, B"). */
export function textoDaResposta(tipo: string, r: Resposta | undefined): string | null {
  if (!r || r.resposta === "na") return null;
  if (tipo === "sim_nao") return r.resposta === "sim" ? "Sim" : r.resposta === "nao" ? "Não" : null;
  if (tipo === "selecao_multipla") return r.selecionadas?.length ? r.selecionadas.join(", ") : null;
  return r.valor?.trim() || null;
}

/** Sim/Não e carinhas não diferenciam uma aplicação da outra; o resto (texto, lista, data…) serve. */
export function serveDeIdentificador(tipo: string) {
  return tipo !== "sim_nao" && tipo !== "carinhas";
}

/** Respostas possíveis de uma pergunta, para configurar exigências e condicionais. */
export function respostasPossiveis(tipo: string, opcoes: readonly string[]) {
  if (tipo === "sim_nao") return ["sim", "nao"];
  if (tipo === "carinhas") return ["ruim", "regular", "bom"];
  if (tipo === "selecao_unica" || tipo === "selecao_multipla") return [...opcoes];
  return [];
}

export function rotuloResposta(chave: string) {
  const fixos: Record<string, string> = { sim: "Sim", nao: "Não", ruim: "Ruim", regular: "Regular", bom: "Bom" };
  return fixos[chave] ?? chave;
}

/** Lê o `exige` gravado no banco (jsonb) ignorando o que não for válido. */
export function lerExige(json: unknown): Exige {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const validos = new Set<string>(COMPLEMENTOS.map((c) => c.valor));
  return Object.fromEntries(
    Object.entries(json as Record<string, unknown>)
      .map(([chave, lista]) => [
        chave,
        Array.isArray(lista) ? (lista.filter((c) => validos.has(c)) as Complemento[]) : [],
      ])
      .filter(([, lista]) => (lista as Complemento[]).length > 0),
  );
}

/** Opção da lista renomeada: o que era exigido nela passa para o nome novo. */
export function renomearNoExige(exige: unknown, antiga: string, nova: string): Exige {
  const atual = lerExige(exige);
  if (!(antiga in atual) || antiga === nova) return atual;
  const { [antiga]: lista, ...resto } = atual;
  return { ...resto, [nova]: lista };
}

/** Opção da lista removida: some também das exigências. */
export function removerDoExige(exige: unknown, opcao: string): Exige {
  return Object.fromEntries(Object.entries(lerExige(exige)).filter(([chave]) => chave !== opcao));
}

/** Complementos que a resposta dada torna obrigatórios. */
export function complementosExigidos(item: { tipo: string; exige?: unknown }, r: Resposta | undefined) {
  const exige = lerExige(item.exige);
  const todos = respostasDadas(item.tipo, r).flatMap((k) => exige[k] ?? []);
  return COMPLEMENTOS.map((c) => c.valor).filter((c) => todos.includes(c));
}

/** Complementos obrigatórios que ainda faltam (vazio quando está tudo certo). */
export function complementosFaltando(item: { tipo: string; exige?: unknown }, r: Resposta | undefined) {
  return complementosExigidos(item, r).filter((c) =>
    c === "comentario" ? !r?.comentario?.trim() : !(r?.anexoFile || r?.anexoPreview),
  );
}

/**
 * Perguntas e seções escondidas pelas condicionais. Quem é alvo de alguma
 * condicional começa escondido e aparece quando uma pergunta-pai visível tem a
 * resposta do gatilho. Pai escondido não mostra ninguém (vale em cadeia).
 */
export function ocultos(
  dependencias: readonly Dependencia[],
  respostas: Record<string, Resposta | undefined>,
  perguntas: ReadonlyMap<string, { tipo: string; secao_id: string }>,
) {
  const alvosPergunta = new Set(dependencias.flatMap((d) => (d.filho_pergunta_id ? [d.filho_pergunta_id] : [])));
  const alvosSecao = new Set(dependencias.flatMap((d) => (d.filho_secao_id ? [d.filho_secao_id] : [])));
  const mostradas = new Set<string>();

  const secaoVisivel = (secaoId: string) => !alvosSecao.has(secaoId) || mostradas.has(`s:${secaoId}`);
  const perguntaVisivel = (id: string) => {
    const p = perguntas.get(id);
    return Boolean(p) && (!alvosPergunta.has(id) || mostradas.has(`p:${id}`)) && secaoVisivel(p!.secao_id);
  };

  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const d of dependencias) {
      const chave = d.filho_pergunta_id ? `p:${d.filho_pergunta_id}` : `s:${d.filho_secao_id}`;
      if (mostradas.has(chave) || !perguntaVisivel(d.pergunta_id)) continue;
      const pai = perguntas.get(d.pergunta_id)!;
      if (respostasDadas(pai.tipo, respostas[d.pergunta_id]).includes(d.gatilho)) {
        mostradas.add(chave);
        mudou = true;
      }
    }
  }

  return {
    perguntas: new Set([...perguntas.keys()].filter((id) => !perguntaVisivel(id))),
    secoes: new Set([...alvosSecao].filter((id) => !secaoVisivel(id))),
  };
}

/**
 * Nota de 0 a 100 com peso: soma dos pesos dos "Sim" ÷ soma dos pesos
 * respondidos (Sim e Não). N/A, outros tipos e peso 0 ficam de fora.
 */
export function notaPonderada(itens: readonly { resposta: string | null; peso: number }[]) {
  let sim = 0;
  let total = 0;
  for (const i of itens) {
    if (i.peso <= 0 || (i.resposta !== "sim" && i.resposta !== "nao")) continue;
    total += i.peso;
    if (i.resposta === "sim") sim += i.peso;
  }
  return total ? Math.round((sim / total) * 100) : null;
}
