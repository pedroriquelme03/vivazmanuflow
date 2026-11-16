import { redirect } from "next/navigation";
import { mapaEmails } from "@/lib/equipe-edicao";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { pessoaDoSistema, sistemasDoLider } from "@/lib/equipe-lider";
import { recursoRequisicaoAusente } from "@/lib/requisicao-acesso";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { AdminApp } from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/admin");
  const sistemas = perfil.role === "lider" ? sistemasDoLider(perfil.ambientes) : [];
  if (perfil.role !== "admin" && sistemas.length === 0) redirect(rotaInicial(perfil.role, perfil.ambientes));
  if (perfil.role === "lider") return <CadastrosDoLider perfil={perfil} sistemas={sistemas} />;

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

/**
 * Líder da Manutenção ou da TI: só a equipe do sistema dele (e os pedidos de
 * acesso, se for da TI). Lido no servidor com a chave de serviço, já filtrado,
 * porque a leitura da tabela de usuários é só do admin.
 */
async function CadastrosDoLider({
  perfil,
  sistemas,
}: {
  perfil: NonNullable<Awaited<ReturnType<typeof getPerfil>>>;
  sistemas: ReturnType<typeof sistemasDoLider>;
}) {
  const servico = createServiceClient();
  const [{ data: usuarios }, { data: propriedades }, solicitacoesRes] = await Promise.all([
    servico.from("usuarios").select("*").order("nome"),
    servico.from("propriedades").select("*").order("nome"),
    sistemas.includes("ti")
      ? servico.from("requisicoes_acesso").select("*").order("criado_em", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  const todos = usuarios ?? [];
  const doSistema = todos.filter((u) => u.id !== perfil.id && pessoaDoSistema(u, sistemas));
  // Só para marcar "já cadastrado" nos pedidos de acesso: não manda os outros e-mails ao navegador.
  const pedidos = new Set((solicitacoesRes.data ?? []).map((s) => s.email.trim().toLowerCase()));
  const emailsEquipe = mapaEmails(
    todos.flatMap((u) => (u.email && pedidos.has(u.email.trim().toLowerCase()) ? [{ id: u.id, email: u.email }] : [])),
  );

  return (
    <PainelComAmbiente perfil={perfil}>
      <AdminApp
        papel="lider"
        sistemas={sistemas}
        propriedades={propriedades ?? []}
        setores={[]}
        locais={[]}
        solicitantes={[]}
        usuarios={doSistema}
        emailsEquipe={emailsEquipe}
        predefinidas={[]}
        pesoConfig={null}
        solicitacoes={solicitacoesRes.data ?? []}
      />
    </PainelComAmbiente>
  );
}
