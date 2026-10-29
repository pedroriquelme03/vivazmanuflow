import { Titulo } from "../../governanca/ui";
import { SQL_NOVIDADES, exigirNovidades } from "../acesso";
import { hojeSp, lerRegistros } from "../dados";
import { listarEquipamentos } from "../equipamentos";
import { NovidadesShell } from "../NovidadesShell";
import { PmocApp, type Pmoc } from "./PmocApp";

export const dynamic = "force-dynamic";

export default async function PmocPage() {
  const perfil = await exigirNovidades("/novidades/pmoc");
  const [{ mapa, faltaTabela }, equipamentos] = await Promise.all([
    lerRegistros<Pmoc>("pmoc"),
    listarEquipamentos(),
  ]);

  return (
    <NovidadesShell perfil={perfil}>
      <div className="print:hidden">
        <Titulo
          titulo="PMOC · Plano de Manutenção, Operação e Controle"
          subtitulo="Monte o PMOC do ar-condicionado seguindo o e-book da Leankeep (Portaria 3.523/98, Lei 13.589/2018, RE-09 Anvisa e NBR 13971). Preencha uma vez, salve e imprima sempre atualizado."
        />
        {faltaTabela && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{SQL_NOVIDADES}</p>
        )}
      </div>
      <PmocApp
        inicial={mapa.geral ?? null}
        equipamentos={equipamentos.filter((e) => e.ativo)}
        hoje={hojeSp()}
      />
    </NovidadesShell>
  );
}
