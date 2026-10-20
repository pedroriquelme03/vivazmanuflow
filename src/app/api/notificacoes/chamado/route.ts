import webpush from "web-push";
import { timingSafeEqual } from "node:crypto";
import {
  destinoDoAviso,
  eventoDoWebhook,
  recebeAvisoNovoChamado,
  textoAviso,
  textoResposta,
} from "@/lib/aviso-push";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function colunaAvisosAusente(mensagem: string) {
  const texto = mensagem.toLowerCase();
  return (
    texto.includes("avisos") &&
    (texto.includes("column") ||
      texto.includes("schema cache") ||
      texto.includes("could not find"))
  );
}

async function listarPessoas(supabase: ReturnType<typeof createServiceClient>) {
  const comAvisos = await supabase
    .from("usuarios")
    .select("id, nome, role, ambientes, ativo, avisos")
    .eq("ativo", true);
  if (!comAvisos.error) return { data: comAvisos.data, error: null };
  if (!colunaAvisosAusente(comAvisos.error.message)) {
    return { data: null, error: comAvisos.error };
  }
  const semAvisos = await supabase
    .from("usuarios")
    .select("id, nome, role, ambientes, ativo")
    .eq("ativo", true);
  if (semAvisos.error) return { data: null, error: semAvisos.error };
  return {
    data: (semAvisos.data ?? []).map((pessoa) => ({ ...pessoa, avisos: null })),
    error: null,
  };
}

function segredoConfere(recebido: string | null, esperado: string | undefined) {
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (
    !segredoConfere(
      request.headers.get("x-notificacao-segredo"),
      process.env.NOTIFICACAO_SEGREDO,
    )
  ) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const assunto = process.env.VAPID_SUBJECT;
  if (!publica || !privada || !assunto) {
    return Response.json({ ok: false }, { status: 500 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: true });
  }

  const evento = eventoDoWebhook(corpo);
  if (!evento) return Response.json({ ok: true });

  try {
    webpush.setVapidDetails(assunto, publica, privada);
    const supabase = createServiceClient();
    const pessoas = await listarPessoas(supabase);
    if (pessoas.error) {
      console.error("aviso push", pessoas.error.message);
      return Response.json({ ok: false }, { status: 500 });
    }

    let destinatarios: { id: string; role: string }[] = [];
    let aviso = { titulo: "Chamado", corpo: "" };

    if (evento.tipo === "chamado") {
      destinatarios = (pessoas.data ?? []).filter((pessoa) =>
        recebeAvisoNovoChamado(pessoa, evento.quadro, evento.abertoPor),
      );
      aviso = textoAviso(evento.quadro, evento.titulo);
    } else {
      const demanda = await supabase
        .from("demandas")
        .select("titulo, solicitante_id, token_acompanhamento")
        .eq("id", evento.demandaId)
        .maybeSingle();
      if (demanda.error || !demanda.data?.solicitante_id) {
        return Response.json({ ok: true });
      }
      const cadastro = await supabase
        .from("solicitantes")
        .select("nome")
        .eq("id", demanda.data.solicitante_id)
        .maybeSingle();
      const nome = cadastro.data?.nome?.trim().toLowerCase() ?? "";
      destinatarios = (pessoas.data ?? []).filter(
        (pessoa) =>
          pessoa.role === "solicitante" &&
          pessoa.nome.trim().toLowerCase() === nome,
      );
      aviso = textoResposta(demanda.data.titulo, evento.texto);
      const token = demanda.data.token_acompanhamento;
      if (token) {
        destinatarios = destinatarios.map((pessoa) => ({
          ...pessoa,
          role: `solicitante:${token}`,
        }));
      }
    }

    const ids = destinatarios.map((pessoa) => pessoa.id);
    if (ids.length === 0) return Response.json({ ok: true });

    const inscricoes = await supabase
      .from("push_inscricoes")
      .select("id, usuario_id, endpoint, p256dh, auth")
      .in("usuario_id", ids);
    if (inscricoes.error) {
      console.error("aviso push", inscricoes.error.message);
      return Response.json({ ok: false }, { status: 500 });
    }

    const papel = new Map(destinatarios.map((pessoa) => [pessoa.id, pessoa.role]));
    await Promise.all(
      (inscricoes.data ?? []).map(async (inscricao) => {
        const role = papel.get(inscricao.usuario_id) ?? "lider";
        const token = role.startsWith("solicitante:") ? role.slice("solicitante:".length) : "";
        const url = token ? `/acompanhar/${token}` : destinoDoAviso(role);
        try {
          await webpush.sendNotification(
            {
              endpoint: inscricao.endpoint,
              keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
            },
            JSON.stringify({
              titulo: aviso.titulo,
              corpo: aviso.corpo,
              url,
            }),
          );
        } catch (erro) {
          const status = (erro as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase.from("push_inscricoes").delete().eq("id", inscricao.id);
          }
        }
      }),
    );
    return Response.json({ ok: true });
  } catch (erro) {
    console.error("aviso push", erro instanceof Error ? erro.message : "falha");
    return Response.json({ ok: false }, { status: 500 });
  }
}
