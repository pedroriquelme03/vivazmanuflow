import { PainelShell } from "@/components/AdminSidebar";
import {
  ambientesDoPapel,
  paineisDoUsuario,
  type PainelEquipe,
} from "@/lib/ambiente-equipe";
import { resolverAmbiente } from "@/lib/resolver-ambiente";
import type { Perfil } from "@/lib/auth";

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
  return (
    <PainelShell
      perfil={perfil}
      ambiente={ambiente}
      mostraTroca={paineisDoUsuario(perfil.ambientes).length > 1}
    >
      {children}
    </PainelShell>
  );
}
