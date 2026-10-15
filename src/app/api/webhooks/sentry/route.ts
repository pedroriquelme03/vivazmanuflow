import {
  assinaturaSentryValida,
  extrairAlertaSentry,
  montarDescricaoAlerta,
  prioridadeAlerta,
} from "@/lib/alerta-sentry";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const corpo = await request.text();
  if (
    !assinaturaSentryValida(
      corpo,
      request.headers.get("sentry-hook-signature"),
      process.env.SENTRY_WEBHOOK_SECRET,
    )
  ) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(corpo);
  } catch {
    return Response.json({ ok: true });
  }

  try {
    const alerta = extrairAlertaSentry(json);
    const supabase = createServiceClient();
    if (!alerta?.issueId) {
      await supabase.from("sentry_alertas_log").insert({
        slug: alerta?.slug ?? null,
        issue_id: null,
        acao: "ignorado",
        detalhe: "payload sem issue",
      });
      return Response.json({ ok: true });
    }

    const prioridade = prioridadeAlerta({
      ambiente: alerta.ambiente,
      nivel: alerta.nivel,
      usuarios: alerta.usuarios,
      ocorrencias: alerta.ocorrencias,
    });
    const { error } = await supabase.rpc("aplicar_alerta_sentry", {
      p_slug: alerta.slug ?? "",
      p_issue_id: alerta.issueId,
      p_nivel: alerta.nivel,
      p_ambiente: alerta.ambiente,
      p_descricao: montarDescricaoAlerta(alerta),
      p_rota: alerta.rota ?? "",
      p_quadro: alerta.quadro ?? "",
      p_ocorrencias: alerta.ocorrencias,
      p_usuarios: alerta.usuarios,
      p_primeira: alerta.primeira,
      p_ultima: alerta.ultima,
      p_sentry_url: alerta.sentryUrl ?? "",
      p_posthog_url: alerta.posthogUrl ?? "",
      p_prioridade: prioridade?.prioridade ?? "media",
      p_afeta: prioridade?.afetaExperiencia ?? false,
    });
    if (error) {
      console.error("alerta sentry", error.message);
      return Response.json({ ok: false }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (erro) {
    console.error(
      "alerta sentry",
      erro instanceof Error ? erro.message : "falha",
    );
    return Response.json({ ok: false }, { status: 500 });
  }
}
