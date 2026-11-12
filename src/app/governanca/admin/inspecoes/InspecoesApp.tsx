"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDataHora, formatarDuracao } from "@/lib/governanca";
import { rotuloSetor, type PropriedadeRef, type SetorChecklist } from "@/lib/checklist-setores";
import {
  FILTROS_VAZIOS,
  STATUS_INSPECAO,
  duracaoMinutos,
  filtrarInspecoes,
  formatarDataCurta,
  opcoesDistintas,
  type FiltrosInspecao,
  type LinhaInspecao,
} from "@/lib/checklist-inspecao";
import { GrupoFiltros } from "@/components/GrupoFiltros";
import { SelectSetor } from "../../Seletores";
import { StatusBadge, Titulo, Vazio, inputCls } from "../../ui";

export function InspecoesApp({
  lista,
  setores,
  meusSetores,
  propriedades,
}: {
  lista: LinhaInspecao[];
  /** Todos os setores, para mostrar o nome. */
  setores: SetorChecklist[];
  /** Setores da pessoa, para o filtro. */
  meusSetores: SetorChecklist[];
  propriedades: PropriedadeRef[];
}) {
  const [filtros, setFiltros] = useState<FiltrosInspecao>(FILTROS_VAZIOS);
  const mudar = (campo: keyof FiltrosInspecao) => (valor: string) => setFiltros((f) => ({ ...f, [campo]: valor }));

  const filtradas = useMemo(() => filtrarInspecoes(lista, filtros), [lista, filtros]);
  const opcoes = useMemo(
    () => ({
      checklists: opcoesDistintas(lista, (i) => i.checklistId, (i) => i.checklist),
      colaboradores: opcoesDistintas(lista, (i) => i.colaboradorId, (i) => i.colaborador),
      aplicadores: opcoesDistintas(lista, (i) => i.aplicadorId, (i) => i.aplicador),
    }),
    [lista],
  );
  const algumFiltro = Object.entries(filtros).some(([campo, valor]) => campo !== "busca" && valor);

  return (
    <>
      <Titulo titulo="Inspeções" subtitulo="Checklists aplicados nos seus setores, do mais recente para o mais antigo." />

      <div className="mb-4 space-y-3">
        <input
          className={`${inputCls} max-w-md`}
          type="search"
          value={filtros.busca}
          onChange={(e) => mudar("busca")(e.target.value)}
          placeholder="Buscar por checklist, local, colaborador ou aplicador…"
        />
        <GrupoFiltros ativo={algumFiltro}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select className={inputCls} value={filtros.status} onChange={(e) => mudar("status")(e.target.value)}>
              <option value="">Todos os status</option>
              {STATUS_INSPECAO.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
            <SelectSetor
              value={filtros.setorId}
              onChange={mudar("setorId")}
              setores={meusSetores}
              propriedades={propriedades}
              vazio="Todos os setores"
            />
            <Opcoes valor={filtros.checklistId} onChange={mudar("checklistId")} opcoes={opcoes.checklists} vazio="Todos os checklists" />
            <Opcoes valor={filtros.colaboradorId} onChange={mudar("colaboradorId")} opcoes={opcoes.colaboradores} vazio="Todos os colaboradores" />
            <Opcoes valor={filtros.aplicadorId} onChange={mudar("aplicadorId")} opcoes={opcoes.aplicadores} vazio="Quem aplicou: todos" />
            <label className="flex items-center gap-2 text-sm text-slate-500">
              De
              <input className={inputCls} type="date" value={filtros.de} onChange={(e) => mudar("de")(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Até
              <input className={inputCls} type="date" value={filtros.ate} onChange={(e) => mudar("ate")(e.target.value)} />
            </label>
            {algumFiltro && (
              <button
                type="button"
                className="text-left text-sm font-medium text-brand-700 hover:underline"
                onClick={() => setFiltros({ ...FILTROS_VAZIOS, busca: filtros.busca })}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </GrupoFiltros>
        <p className="text-xs text-slate-500">
          {filtradas.length} de {lista.length} {lista.length === 1 ? "inspeção" : "inspeções"}
        </p>
      </div>

      {filtradas.length === 0 ? (
        <Vazio texto="Nenhuma inspeção encontrada." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Checklist</th>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Colaborador</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Aplicado por</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Duração</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((i) => (
                <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/governanca/inspecao/${i.id}`} className="font-semibold text-brand-700 hover:underline">
                      {i.checklist}
                    </Link>
                    {i.identificacao && <span className="block text-xs font-medium text-slate-600">{i.identificacao}</span>}
                    <span className="block text-xs text-slate-400">{rotuloSetor(i.setorId, setores, propriedades)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{i.local ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{i.colaborador ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{i.aplicador ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500" title={`Início: ${formatDataHora(i.criadoEm)}`}>
                    {formatarDataCurta(i.dataReferencia)}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                    {formatarDuracao(duracaoMinutos(i.criadoEm, i.finalizadaEm))}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Opcoes({
  valor,
  onChange,
  opcoes,
  vazio,
}: {
  valor: string;
  onChange: (valor: string) => void;
  opcoes: { valor: string; rotulo: string }[];
  vazio: string;
}) {
  return (
    <select className={inputCls} value={valor} onChange={(e) => onChange(e.target.value)}>
      <option value="">{vazio}</option>
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}
