import Link from "next/link";
import { Titulo, cardCls } from "../../governanca/ui";
import { SQL_NOVIDADES, exigirNovidades } from "../acesso";
import { hojeSp, lerRegistros } from "../dados";
import { listarEquipamentos } from "../equipamentos";
import { NovidadesShell } from "../NovidadesShell";
import { InventarioApp, type FichaInventario } from "./InventarioApp";

export const dynamic = "force-dynamic";

const EXCECOES = [
  ["Possível duplicidade", "Pausar a junção do histórico", "Comparar código, série, área e evidência"],
  ["Local divergente", "Manter a divergência até confirmar", "Conferir a instalação atual"],
  ["Placa ilegível", "Dado técnico fica não confirmado", "Buscar documento correspondente"],
  ["Ativo não localizado", "Marcar como não localizado (não é baixa)", "Checar transferência, retirada ou erro"],
  ["Equipamento sem cadastro", "Criar código provisório", "Confirmar escopo e dar o código final"],
  ["Ativo desativado", "Separar da população em operação", "Confirmar a baixa e manter o histórico"],
];

export default async function InventarioPage() {
  const perfil = await exigirNovidades("/novidades/inventario");
  const [equipamentos, { mapa, faltaTabela }] = await Promise.all([
    listarEquipamentos(),
    lerRegistros<FichaInventario>("inventario"),
  ]);

  return (
    <NovidadesShell perfil={perfil} largo>
      <Titulo
        titulo="Inventário de ativos"
        subtitulo="Completa cada equipamento com o dicionário de campos da Leankeep: TAG, série e patrimônio separados, dado técnico com unidade, estado de operação e situação do cadastro."
      />
      {faltaTabela && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{SQL_NOVIDADES}</p>
      )}
      {equipamentos.length === 0 ? (
        <div className={`${cardCls} text-sm text-slate-600`}>
          Nenhum equipamento cadastrado. Cadastre em{" "}
          <Link href="/admin/areas" className="font-semibold text-brand-700 underline">
            Áreas
          </Link>{" "}
          e volte aqui para completar o inventário.
        </div>
      ) : (
        <InventarioApp equipamentos={equipamentos} fichas={mapa} hoje={hojeSp()} />
      )}

      <section className={`${cardCls} mt-6`}>
        <h2 className="font-bold text-slate-800">Como tratar exceções</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-1">Achado</th>
                <th className="py-1">Decisão</th>
                <th className="py-1">Próximo passo</th>
              </tr>
            </thead>
            <tbody>
              {EXCECOES.map(([a, d, p]) => (
                <tr key={a} className="border-t border-slate-100">
                  <td className="py-1.5 pr-3 font-medium text-slate-700">{a}</td>
                  <td className="py-1.5 pr-3 text-slate-600">{d}</td>
                  <td className="py-1.5 text-slate-600">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>Use um código estável e não coloque o local dentro dele (ex.: HZ-EV-001 = unidade, tipo, sequência). Se o equipamento mudar de lugar, troca só a área.</li>
          <li>Não estime dado técnico pela aparência e mantenha a unidade de medida (kW, BTU/h, V).</li>
          <li>&quot;Não localizado&quot; não quer dizer &quot;não existe&quot; e não justifica baixa sozinho.</li>
        </ul>
      </section>
    </NovidadesShell>
  );
}
