import Link from "next/link";
import { CRITERIOS_CRITICIDADE } from "@/lib/novidades/calculos";
import { Titulo, cardCls } from "../../governanca/ui";
import { SQL_NOVIDADES, exigirNovidades } from "../acesso";
import { hojeSp, lerRegistros } from "../dados";
import { listarEquipamentos } from "../equipamentos";
import { NovidadesShell } from "../NovidadesShell";
import { CriticidadeApp, type FichaCriticidade } from "./CriticidadeApp";

export const dynamic = "force-dynamic";

export default async function CriticidadePage() {
  const perfil = await exigirNovidades("/novidades/criticidade");
  const [equipamentos, { mapa, faltaTabela }] = await Promise.all([
    listarEquipamentos(),
    lerRegistros<FichaCriticidade>("criticidade"),
  ]);

  return (
    <NovidadesShell perfil={perfil} largo>
      <Titulo
        titulo="Criticidade de equipamentos"
        subtitulo="Classifique cada equipamento em A, B ou C pela consequência de perder a função. A classe final é a pior nota entre os três critérios (regra conservadora: uma consequência grave não some na média)."
      />
      {faltaTabela && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{SQL_NOVIDADES}</p>
      )}

      <section className={`${cardCls} mb-5 overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="py-1 pr-3">Critério</th>
              <th className="py-1 pr-3 text-red-700">A · consequência elevada</th>
              <th className="py-1 pr-3 text-amber-700">B · intermediária</th>
              <th className="py-1 text-emerald-700">C · limitada</th>
            </tr>
          </thead>
          <tbody>
            {CRITERIOS_CRITICIDADE.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 align-top">
                <td className="py-2 pr-3 font-semibold text-slate-700">{c.rotulo}</td>
                <td className="py-2 pr-3 text-slate-600">{c.A}</td>
                <td className="py-2 pr-3 text-slate-600">{c.B}</td>
                <td className="py-2 text-slate-600">{c.C}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          Falta de dado não é criticidade baixa: o equipamento fica &quot;pendente&quot;. Classe A não obriga sensor
          em tudo, e classe C não autoriza abandonar atividades necessárias. Urgência de um chamado é outra coisa.
        </p>
      </section>

      {equipamentos.length === 0 ? (
        <div className={`${cardCls} text-sm text-slate-600`}>
          Cadastre equipamentos em{" "}
          <Link href="/admin/areas" className="font-semibold text-brand-700 underline">
            Áreas
          </Link>{" "}
          para classificar.
        </div>
      ) : (
        <CriticidadeApp equipamentos={equipamentos} fichas={mapa} hoje={hojeSp()} />
      )}
    </NovidadesShell>
  );
}
