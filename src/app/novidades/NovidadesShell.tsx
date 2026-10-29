import type { Perfil } from "@/lib/auth";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { NovidadesNav } from "./NovidadesNav";

/** Moldura do módulo Novidades: menu lateral + abas + aviso de "em construção". */
export function NovidadesShell({
  perfil,
  largo = false,
  children,
}: {
  perfil: Perfil;
  largo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PainelComAmbiente perfil={perfil}>
      <NovidadesNav />
      <div className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
        <div className={`mx-auto w-full px-4 py-6 ${largo ? "max-w-6xl" : "max-w-4xl"}`}>
          <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 print:hidden">
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Em construção
            </span>
            Ferramentas novas em teste, baseadas nos modelos da Leankeep. Podem mudar.
          </p>
          {children}
        </div>
      </div>
    </PainelComAmbiente>
  );
}
