import { PainelShell } from "@/components/AdminSidebar";
import { ambientesDoPapel } from "@/lib/ambiente-equipe";
import { resolverAmbiente } from "@/lib/resolver-ambiente";
import type { Perfil } from "@/lib/auth";

export async function PainelComAmbiente({
  perfil,
  children,
}: {
  perfil: Perfil;
  children: React.ReactNode;
}) {
  const ambiente = await resolverAmbiente(perfil.ambientes, perfil.role);
  return (
    <PainelShell
      perfil={perfil}
      ambiente={ambiente}
      mostraTroca={ambientesDoPapel(perfil.role, perfil.ambientes).length > 1}
    >
      {children}
    </PainelShell>
  );
}
