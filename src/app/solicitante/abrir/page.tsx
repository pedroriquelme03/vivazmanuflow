import Link from "next/link";
import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/BrandMark";
import { AbrirComoSolicitante } from "./AbrirComoSolicitante";
import { SolicitanteNav } from "../SolicitanteNav";

export const dynamic = "force-dynamic";

export default async function SolicitanteAbrirPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/solicitante");
  if (perfil.role !== "solicitante") redirect(rotaInicial(perfil.role));

  const { tipo } = await searchParams;
  const ambiente = tipo === "manutencao" ? "manutencao" : "ti";

  const supabase = await createClient();
  const [{ data: propriedades }, { data: solicitantes }, sistemasRes] = await Promise.all([
    supabase
      .from("propriedades")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("solicitantes")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .order("nome"),
    ambiente === "ti"
      ? supabase
          .from("sistemas")
          .select("id, nome")
          .eq("ativo", true)
          .order("nome")
      : Promise.resolve({ data: [], error: null }),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-28">
        <Link
          href="/solicitante"
          className="text-sm text-slate-400 transition hover:text-brand-700"
        >
          ← Voltar
        </Link>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 text-center">
            <BrandMark className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30" />
            <h1 className="text-xl font-bold">
              {ambiente === "ti"
                ? "Abrir chamado de TI"
                : "Abrir chamado de Manutenção"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              O chamado fica no seu nome.
            </p>
          </div>
          <AbrirComoSolicitante
            ambiente={ambiente}
            propriedades={propriedades ?? []}
            solicitantes={solicitantes ?? []}
            nomeSolicitantePadrao={perfil.nome}
            propriedadePadrao={perfil.propriedade_id}
            sistemas={sistemasRes.data ?? []}
          />
        </div>
      </main>
      <SolicitanteNav />
    </div>
  );
}
