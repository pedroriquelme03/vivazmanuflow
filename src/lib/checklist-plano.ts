/**
 * Plano de ação configurável (padrão 5W2H do Checklist Fácil). Além de
 * prioridade, "o que fazer" e "quem vai fazer" (que sempre aparecem), cada
 * pergunta escolhe se pede prazo, onde, por quê, como e quanto custa — e se
 * cada um é opcional ou obrigatório.
 */

export type CampoPlano = "prazo" | "onde" | "por_que" | "como" | "custo";
export type ModoCampoPlano = "oculto" | "opcional" | "obrigatorio";
export type ConfigPlano = Partial<Record<CampoPlano, "opcional" | "obrigatorio">>;
export type ExtrasPlano = Partial<Record<CampoPlano, string>>;

export const CAMPOS_PLANO: { campo: CampoPlano; rotulo: string; dica: string; tipo: "date" | "text" | "number" }[] = [
  { campo: "prazo", rotulo: "Prazo", dica: "Até quando fazer", tipo: "date" },
  { campo: "onde", rotulo: "Onde", dica: "Local exato", tipo: "text" },
  { campo: "por_que", rotulo: "Por quê", dica: "Motivo ou risco", tipo: "text" },
  { campo: "como", rotulo: "Como", dica: "Passos, material", tipo: "text" },
  { campo: "custo", rotulo: "Quanto custa (R$)", dica: "Estimativa", tipo: "number" },
];

export const MODOS_CAMPO_PLANO: { valor: ModoCampoPlano; rotulo: string }[] = [
  { valor: "oculto", rotulo: "Não pede" },
  { valor: "opcional", rotulo: "Opcional" },
  { valor: "obrigatorio", rotulo: "Obrigatório" },
];

export function lerCamposPlano(json: unknown): ConfigPlano {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const config: ConfigPlano = {};
  for (const { campo } of CAMPOS_PLANO) {
    const v = (json as Record<string, unknown>)[campo];
    if (v === "opcional" || v === "obrigatorio") config[campo] = v;
  }
  return config;
}

export function modoCampoPlano(config: ConfigPlano, campo: CampoPlano): ModoCampoPlano {
  return config[campo] ?? "oculto";
}

/** Config com um campo mudado; "oculto" tira o campo (o padrão). */
export function mudarCampoPlano(config: ConfigPlano, campo: CampoPlano, modo: ModoCampoPlano): ConfigPlano {
  const novo = { ...config };
  if (modo === "oculto") delete novo[campo];
  else novo[campo] = modo;
  return novo;
}

/** Campos extras que aparecem no plano desta pergunta, na ordem certa. */
export function camposDoPlano(config: ConfigPlano) {
  return CAMPOS_PLANO.filter((c) => config[c.campo]).map((c) => ({ ...c, obrigatorio: config[c.campo] === "obrigatorio" }));
}

/** Rótulos dos campos obrigatórios que ainda estão vazios. */
export function planoFaltando(config: ConfigPlano, extras: ExtrasPlano | undefined) {
  return camposDoPlano(config)
    .filter((c) => c.obrigatorio && !(extras?.[c.campo] ?? "").trim())
    .map((c) => c.rotulo);
}

/** "1.234,50" ou "1234.5" vira número; o resto, null. */
export function lerValor(texto: string | undefined) {
  const limpo = (texto ?? "").trim().replace(/\s/g, "");
  if (!limpo) return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** Só os campos que a pergunta pede vão para o banco; os outros ficam vazios. */
export function extrasParaGravar(config: ConfigPlano, extras: ExtrasPlano | undefined) {
  const texto = (campo: CampoPlano) => (config[campo] ? (extras?.[campo] ?? "").trim() || null : null);
  return {
    prazo: texto("prazo"),
    onde: texto("onde"),
    por_que: texto("por_que"),
    como: texto("como"),
    custo: config.custo ? lerValor(extras?.custo) : null,
  };
}

/** Do banco para a tela (rascunho e resumo). */
export function extrasDoBanco(linha: Partial<Record<CampoPlano, string | number | null>>): ExtrasPlano {
  const extras: ExtrasPlano = {};
  for (const { campo } of CAMPOS_PLANO) {
    const v = linha[campo];
    if (v !== null && v !== undefined && v !== "") extras[campo] = String(v);
  }
  return extras;
}
