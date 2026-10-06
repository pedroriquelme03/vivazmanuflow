import { redirect } from "next/navigation";
import { mapaEmails } from "@/lib/equipe-edicao";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { recursoRequisicaoAusente } from "@/lib/requisicao-acesso";
import { createClient } from "@/lib/supabase/server";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { AdminApp } from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/admin");
  if (perfil.role !== "admin") redirect(rotaInicial(perfil.role));

  const supabase = await createClient();
  const [
    { data: propriedades },
    { data: setores },
    { data: locais },
    { data: solicitantes },
    { data: usuarios },
    predefRes,
    pesoRes,
    solicitacoesRes,
    emailsRes,
  ] = await Promise.all([
    supabase.from("propriedades").select("*").order("nome"),
    supabase.from("setores").select("*").order("nome"),
    supabase.from("locais").select("*").order("nome"),
    supabase.from("solicitantes").select("*").order("nome"),
    supabase.from("usuarios").select("*").order("nome"),
    supabase.from("demandas_predefinidas").select("*").order("titulo"),
    supabase.from("peso_config").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("requisicoes_acesso")
      .select("*")
      .order("criado_em", { ascending: false }),
    supabase.rpc("admin_emails_equipe"),
  ]);

  const emailsEquipe = mapaEmails([
    ...(emailsRes.data ?? []),
    ...(usuarios ?? []).flatMap((u) =>
      u.email ? [{ id: u.id, email: u.email }] : [],
    ),
  ]);
  const tabelaSolicitacoesAusente = Boolean(
    solicitacoesRes.error &&
      recursoRequisicaoAusente(solicitacoesRes.error.message),
  );

  return (
    <PainelComAmbiente perfil={perfil}>
      <AdminApp
        propriedades={propriedades ?? []}
        setores={setores ?? []}
        locais={locais ?? []}
        solicitantes={solicitantes ?? []}
        usuarios={usuarios ?? []}
        emailsEquipe={emailsEquipe}
        predefinidas={predefRes.data ?? []}
        pesoConfig={pesoRes.data ?? null}
        solicitacoes={solicitacoesRes.data ?? []}
        avisoSolicitacoes={
          tabelaSolicitacoesAusente
            ? "Rode o SQL de solicitações no Supabase para ver os pedidos de login."
            : null
        }
      />
    </PainelComAmbiente>
  );
}
