import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { destinoAutenticado } from "@/lib/rotas";
import { COOKIE_AMBIENTE } from "@/lib/ambiente-equipe";

/** Rotas que exigem login (área do staff). */
const PROTECTED_PREFIXES = [
  "/lider",
  "/colaborador",
  "/admin",
  "/solicitante",
  "/governanca",
];

/**
 * Mantém a sessão do Supabase atualizada nos cookies e protege as áreas
 * internas. Quem já entrou não vê de novo a capa nem o login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: não coloque código entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/" || path === "/login")) {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("role, ativo, ambientes")
      .eq("id", user.id)
      .maybeSingle();

    const destino = destinoAutenticado(
      path,
      perfil,
      request.nextUrl.searchParams.get("next"),
      request.cookies.get(COOKIE_AMBIENTE)?.value,
    );
    if (destino) return redirecionarComSessao(request, destino, supabaseResponse);
  }

  return supabaseResponse;
}

/** Leva os cookies renovados da sessão junto com o redirect. */
function redirecionarComSessao(
  request: NextRequest,
  destino: string,
  sessao: NextResponse,
) {
  const url = request.nextUrl.clone();
  const [caminho, consulta] = destino.split("?");
  url.pathname = caminho || "/";
  url.search = consulta ? `?${consulta}` : "";
  const resposta = NextResponse.redirect(url);
  sessao.cookies.getAll().forEach(({ name, value, ...opcoes }) => {
    resposta.cookies.set(name, value, opcoes);
  });
  return resposta;
}
