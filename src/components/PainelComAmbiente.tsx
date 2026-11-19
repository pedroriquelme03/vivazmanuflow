import { PainelShell } from "@/components/AdminSidebar";
import {
  ambientesDoPapel,
  paineisDoUsuario,
  type PainelEquipe,
} from "@/lib/ambiente-equipe";
import { resolverAmbiente } from "@/lib/resolver-ambiente";
import type { Perfil } from "@/lib/auth";
import { acessosDoSetor } from "@/lib/checklist-acessos";
import { papelGovernanca } from "@/lib/governanca";
import { createClient } from "@/lib/supabase/server";

export async function PainelComAmbiente({
  perfil,
  painel,
  children,
}: {
  perfil: Perfil;
  painel?: PainelEquipe;
  children: React.ReactNode;
}) {
  const semChamados = ambientesDoPapel(perfil.role, perfil.ambientes).length === 0;
  const ambiente: PainelEquipe =
    painel ?? (semChamados ? "checklist" : await resolverAmbiente(perfil.ambientes, perfil.role));
  // No Checklist, o menu depende do setor da pessoa (Governança, Recreação).
  const acessos =
    ambiente === "checklist"
      ? await acessosDoSetor(
          await createClient(),
          perfil.id,
          papelGovernanca(perfil.role, perfil.governanca_papel, perfil.ambientes),
        )
      : undefined;
  return (
    <PainelShell
      perfil={perfil}
      ambiente={ambiente}
      acessos={acessos}
      mostraTroca={paineisDoUsuario(perfil.ambientes).length > 1}
    >
      {children}
    </PainelShell>
  );
}
