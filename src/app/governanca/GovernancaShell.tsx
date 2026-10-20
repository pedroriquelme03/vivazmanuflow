import type { Perfil } from "@/lib/auth";
import type { GovPapel } from "@/lib/governanca";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";

/** Moldura das telas de checklist: o painel com o menu lateral do ambiente Checklist. */
export function GovernancaShell({
  perfil,
  largo = false,
  children,
}: {
  perfil: Perfil;
  papel: GovPapel;
  largo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PainelComAmbiente perfil={perfil} painel="checklist">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={`mx-auto w-full px-4 py-6 ${largo ? "max-w-7xl" : "max-w-4xl"}`}>
          {children}
        </div>
      </div>
    </PainelComAmbiente>
  );
}
