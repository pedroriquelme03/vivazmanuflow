import { createHmac, timingSafeEqual } from "node:crypto";
import { slugValido } from "@/lib/slug-sistema";

const ABERTOS = new Set([
  "aberta",
  "atribuida",
  "em_andamento",
  "aguardando_validacao",
]);

export type PrioridadeAlerta = {
  prioridade: "alta" | "media";
  afetaExperiencia: boolean;
};

export type DecisaoAlerta = {
  acao: "criar" | "atualizar" | "reabrir";
  historico: string | null;
};

export type AlertaSentry = {
  slug: string | null;
  issueId: string | null;
  nivel: string;
  ambiente: string;
  mensagem: string;
  rota: string | null;
  quadro: "ti" | "manutencao" | null;
  ocorrencias: number;
  usuarios: number;
  primeira: string | null;
  ultima: string | null;
  sentryUrl: string | null;
  posthogUrl: string | null;
  posthogSession: string | null;
};

export function assinaturaSentryValida(
  corpo: string,
  assinatura: string | null,
  segredo: string | undefined,
) {
  if (!segredo || !assinatura) return false;
  const esperado = createHmac("sha256", segredo)
    .update(corpo, "utf8")
    .digest("hex");
  const recebido = assinatura.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(recebido) || recebido.length !== esperado.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));
}

export function sanitizarTexto(valor: string, max = 500) {
  return valor
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g, "[redigido]")
    .replace(/bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [redigido]")
    .replace(
      /([?&](?:token|senha|password|authorization|cookie|jwt|secret|access_token|refresh_token)=)[^&\s]*/gi,
      "$1[redigido]",
    )
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, max);
}

export function urlPermitida(valor: string | null, max = 300) {
  if (!valor) return null;
  const limpa = sanitizarTexto(valor, max).trim();
  if (!/^https:\/\//i.test(limpa)) return null;
  const semConsulta = /token|senha|password|authorization|cookie|jwt|secret/i.test(
    limpa,
  )
    ? limpa.split("?")[0]
    : limpa;
  return semConsulta.slice(0, max) || null;
}

/** Só produção abre chamado. Alta usa prioridade alta e afeta a experiência. */
export function prioridadeAlerta(entrada: {
  ambiente: string;
  nivel: string;
  usuarios: number;
  ocorrencias: number;
}): PrioridadeAlerta | null {
  if (entrada.ambiente.trim().toLowerCase() !== "production") return null;
  const nivel = entrada.nivel.trim().toLowerCase();
  if (nivel === "fatal") {
    return { prioridade: "alta", afetaExperiencia: true };
  }
  if (nivel !== "error") return null;
  const alta = entrada.usuarios >= 5 || entrada.ocorrencias >= 10;
  return alta
    ? { prioridade: "alta", afetaExperiencia: true }
    : { prioridade: "media", afetaExperiencia: false };
}

export function decisaoAlerta(
  atual: { status: string; arquivado: boolean; ocorrencias: number } | null,
  novasOcorrencias: number,
): DecisaoAlerta {
  if (!atual) return { acao: "criar", historico: null };
  if (!atual.arquivado && ABERTOS.has(atual.status)) {
    const dobrou =
      atual.ocorrencias > 0 && novasOcorrencias >= atual.ocorrencias * 2;
    return {
      acao: "atualizar",
      historico: dobrou
        ? `O erro passou de ${atual.ocorrencias} para ${novasOcorrencias} ocorrências.`
        : null,
    };
  }
  return { acao: "reabrir", historico: "O erro voltou no Sentry" };
}

export function montarDescricaoAlerta(alerta: AlertaSentry) {
  const quadro =
    alerta.quadro === "ti"
      ? "Tela de TI"
      : alerta.quadro === "manutencao"
        ? "Tela de Manutenção"
        : null;
  const linhas = [
    alerta.mensagem,
    alerta.rota ? `Rota: ${alerta.rota}` : null,
    quadro,
    alerta.ambiente ? `Ambiente: ${alerta.ambiente}` : null,
    alerta.issueId ? `Issue: ${alerta.issueId}` : null,
    alerta.sentryUrl ? `Sentry: ${alerta.sentryUrl}` : null,
    !alerta.posthogUrl && alerta.posthogSession
      ? `Sessão PostHog: ${alerta.posthogSession}`
      : null,
  ].filter((linha): linha is string => Boolean(linha));
  return sanitizarTexto(linhas.join("\n"), 2000);
}

export function extrairAlertaSentry(corpo: unknown): AlertaSentry | null {
  const raiz = objeto(corpo);
  if (!raiz) return null;
  const data = objeto(raiz.data) ?? raiz;
  const event =
    objeto(data.event) ?? objeto(data.error) ?? objeto(raiz.event);
  const issue = objeto(data.issue) ?? objeto(raiz.issue);
  const tags = {
    ...tagsDe(issue?.tags),
    ...tagsDe(data.tags),
    ...tagsDe(event?.tags),
  };
  const metadata = objeto(event?.metadata) ?? objeto(issue?.metadata);
  const request = objeto(event?.request);
  const mensagemBruta =
    texto(event?.title) ??
    texto(event?.message) ??
    texto(issue?.title) ??
    juntar(texto(metadata?.type), texto(metadata?.value)) ??
    "Erro identificado automaticamente";
  const rotaBruta =
    tags.url ??
    texto(request?.url) ??
    texto(event?.culprit) ??
    texto(event?.location) ??
    texto(issue?.culprit);
  const quadro = tags.quadro === "ti" || tags.quadro === "manutencao"
    ? tags.quadro
    : null;
  const slugBruto = tags.sistema?.trim().toLowerCase() ?? "";
  const issueBruto =
    texto(event?.issue_id) ?? texto(issue?.id) ?? texto(event?.issueId) ?? "";
  const issueId = /^[A-Za-z0-9_-]{1,64}$/.test(issueBruto) ? issueBruto : null;
  const posthogSession = tags.posthog_session ?? null;

  return {
    slug: slugValido(slugBruto) ? slugBruto : null,
    issueId,
    nivel: (
      texto(event?.level) ??
      texto(issue?.level) ??
      tags.level ??
      "error"
    ).toLowerCase(),
    ambiente: (
      texto(event?.environment) ??
      texto(issue?.environment) ??
      tags.environment ??
      ""
    ).toLowerCase(),
    mensagem: sanitizarTexto(mensagemBruta, 500),
    rota: rotaLimpa(rotaBruta),
    quadro,
    ocorrencias: inteiro(issue?.count ?? event?.count ?? tags.times_seen, 1),
    usuarios: inteiro(issue?.userCount ?? issue?.user_count, 0),
    primeira: instante(issue?.firstSeen ?? event?.datetime ?? event?.timestamp),
    ultima: instante(issue?.lastSeen ?? event?.datetime ?? event?.timestamp),
    sentryUrl: escolherUrl(
      issue?.permalink,
      event?.web_url,
      issue?.web_url,
    ),
    posthogUrl: urlPermitida(tags.posthog_replay ?? null, 200),
    posthogSession:
      posthogSession && /^[A-Za-z0-9_-]{8,80}$/.test(posthogSession)
        ? posthogSession
        : null,
  };
}

function rotaLimpa(valor: string | null) {
  if (!valor) return null;
  const semSegredo = sanitizarTexto(valor, 300).replace(/[?#].*$/, "").trim();
  return semSegredo.slice(0, 200) || null;
}

function escolherUrl(...candidatos: unknown[]) {
  for (const candidato of candidatos) {
    const url = urlPermitida(texto(candidato), 300);
    if (url && !url.includes("/api/")) return url;
  }
  return null;
}

function juntar(tipo: string | null, valor: string | null) {
  if (tipo && valor) return `${tipo}: ${valor}`;
  return valor ?? tipo;
}

function objeto(valor: unknown): Record<string, unknown> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

function texto(valor: unknown) {
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo ? limpo : null;
}

function inteiro(valor: unknown, padrao: number) {
  const numero =
    typeof valor === "number"
      ? valor
      : typeof valor === "string"
        ? Number(valor)
        : Number.NaN;
  if (!Number.isFinite(numero)) return padrao;
  return Math.max(0, Math.min(1_000_000, Math.trunc(numero)));
}

function instante(valor: unknown) {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    const ms = valor < 10_000_000_000 ? valor * 1000 : valor;
    const data = new Date(ms);
    return Number.isNaN(data.getTime()) ? null : data.toISOString();
  }
  if (typeof valor !== "string" || !valor.trim()) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

function tagsDe(valor: unknown) {
  const mapa: Record<string, string> = {};
  if (Array.isArray(valor)) {
    for (const item of valor) {
      if (Array.isArray(item) && item.length >= 2) {
        const chave = texto(item[0]);
        const conteudo = texto(item[1]);
        if (chave && conteudo) mapa[chave] = conteudo;
      } else {
        const par = objeto(item);
        const chave = texto(par?.key);
        const conteudo = texto(par?.value);
        if (chave && conteudo) mapa[chave] = conteudo;
      }
    }
    return mapa;
  }
  const registro = objeto(valor);
  if (!registro) return mapa;
  for (const [chave, conteudo] of Object.entries(registro)) {
    const limpo = texto(conteudo);
    if (limpo) mapa[chave] = limpo;
  }
  return mapa;
}
