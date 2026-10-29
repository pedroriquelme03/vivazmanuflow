import { createClient } from "@/lib/supabase/server";
import { Titulo } from "../../governanca/ui";
import { exigirNovidades } from "../acesso";
import { hojeSp } from "../dados";
import { NovidadesShell } from "../NovidadesShell";
import { BibliotecaAtividades } from "./BibliotecaAtividades";

export const dynamic = "force-dynamic";

export default async function AtividadesPage() {
  const perfil = await exigirNovidades("/novidades/atividades");
  const supabase = await createClient();
  const { data: lugares } = await supabase
    .from("preventiva_locais")
    .select("id, nome, ativo")
    .eq("ativo", true)
    .order("nome");

  return (
    <NovidadesShell perfil={perfil} largo>
      <Titulo
        titulo="Biblioteca de atividades"
        subtitulo="Atividades preventivas da planilha da Leankeep, organizadas por tipo de equipamento. Marque as que servem e crie as rotinas de uma vez."
      />
      <BibliotecaAtividades lugares={lugares ?? []} hoje={hojeSp()} />
    </NovidadesShell>
  );
}
