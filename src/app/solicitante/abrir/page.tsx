import Link from "next/link";
import { redirect } from "next/navigation";
import { listaAmbientes } from "@/lib/ambiente-equipe";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CartaoAbrirChamado } from "./CartaoAbrirChamado";
import { SolicitanteNav } from "../SolicitanteNav";

export const dynamic = "force-dynamic";

export default async function SolicitanteAbrirPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/solicitante");
  if (perfil.role !== "solicitante") redirect(rotaInicial(perfil.role, perfil.ambientes));

  const { tipo } = await searchParams;
  const permitidos = listaAmbientes(perfil.ambientes);
  const pedido = tipo === "manutencao" || tipo === "ti" ? tipo : null;
  // Sem área escolhida (ou uma que a pessoa não tem): volta para a escolha.
  // Nunca marca uma área sozinho.
  if (!pedido || !permitidos.includes(pedido)) redirect("/solicitante");
  const ambiente = pedido;

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
        <CartaoAbrirChamado
          className="mt-4"
          ambiente={ambiente}
          nome={perfil.nome}
          propriedadePadrao={perfil.propriedade_id}
          propriedades={propriedades ?? []}
          solicitantes={solicitantes ?? []}
          sistemas={sistemasRes.data ?? []}
        />
      </main>
      <SolicitanteNav />
    </div>
  );
}
