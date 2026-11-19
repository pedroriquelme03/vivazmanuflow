import { timingSafeEqual } from "node:crypto";
import { sincronizarOcupacao } from "@/lib/ocupacao-sincronizar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Busca a ocupação do painel operacional. A Vercel chama às 13h e às 17h
 * (vercel.json) mandando "Authorization: Bearer <CRON_SECRET>". São duas
 * chamadas por dia: não pesa nada no sistema.
 */
function autorizado(cabecalho: string | null) {
  const segredo = process.env.CRON_SECRET;
  if (!cabecalho || !segredo) return false;
  const a = Buffer.from(cabecalho);
  const b = Buffer.from(`Bearer ${segredo}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!autorizado(request.headers.get("authorization"))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    const { dias } = await sincronizarOcupacao();
    return Response.json({ ok: true, dias: dias.map((d) => ({ data: d.data, adultos: d.adultos, criancas: d.criancas })) });
  } catch (e) {
    console.error("Falha ao buscar a ocupação do painel operacional", e);
    return Response.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
