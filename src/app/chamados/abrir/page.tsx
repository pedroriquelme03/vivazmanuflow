import Link from "next/link";
import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { lerAmbiente } from "@/lib/ambiente-equipe";
import { resolverVoltar } from "@/lib/resolver-ambiente";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/BrandMark";
import { AbrirComoSolicitante } from "@/app/solicitante/abrir/AbrirComoSolicitante";
import { ChamadosNav } from "../ChamadosNav";

export const dynamic = "force-dynamic";

/**
 * Qualquer pessoa logada abre chamado de Manutenção ou de TI, mesmo sem fazer
 * parte da área. `usuarios.ambientes` só decide onde ela trabalha.
 */
export default async function AbrirChamadoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/chamados/abrir");

  const tipo = lerAmbiente((await searchParams).tipo);
  if (perfil.role === "solicitante") {
    redirect(tipo ? `/solicitante/abrir?tipo=${tipo}` : "/solicitante");
  }
  const [voltar, supabase] = await Promise.all([resolverVoltar(perfil), createClient()]);
  // Sem tipo na URL, começa pela área do painel de onde a pessoa veio.
  const ambiente = tipo ?? voltar.ambiente;

  // O chamado fica no nome da pessoa: só precisa das linhas com o nome dela.
  const nomeLike = perfil.nome.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const [{ data: propriedades }, { data: solicitantes }, sistemasRes] = await Promise.all([
    supabase.from("propriedades").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("solicitantes")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .ilike("nome", nomeLike),
    ambiente === "ti"
      ? supabase.from("sistemas").select("id, nome").eq("ativo", true).order("nome")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const opcao = (valor: "manutencao" | "ti", rotulo: string, cor: string) => (
    <Link
      href={`/chamados/abrir?tipo=${valor}`}
      className={`rounded-full px-3 py-2 text-center ${
        ambiente === valor ? `${cor} text-white shadow` : "text-slate-500"
      }`}
    >
      {rotulo}
    </Link>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-16">
        <ChamadosNav voltar={voltar} atual="abrir" />
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 text-center">
            <BrandMark className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30" />
            <h1 className="text-xl font-bold">
              {ambiente === "ti" ? "Abrir chamado de TI" : "Abrir chamado de Manutenção"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">O chamado fica no seu nome.</p>
          </div>
          <div className="mb-5 grid grid-cols-2 rounded-full bg-slate-100 p-1 text-sm font-semibold">
            {opcao("manutencao", "Manutenção", "bg-brand-600")}
            {opcao("ti", "TI", "bg-[#1E293B]")}
          </div>
          <AbrirComoSolicitante
            ambiente={ambiente}
            propriedades={propriedades ?? []}
            solicitantes={solicitantes ?? []}
            nomeSolicitantePadrao={perfil.nome}
            propriedadePadrao={perfil.propriedade_id}
            sistemas={sistemasRes.data ?? []}
            destino={`/chamados?tipo=${ambiente}`}
          />
        </div>
      </main>
    </div>
  );
}
