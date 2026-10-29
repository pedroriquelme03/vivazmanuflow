"use client";

import { useMemo, useState } from "react";
import {
  capacidadeLiquida,
  diasEntre,
  resumoBacklog,
  semanasEquivalentes,
} from "@/lib/novidades/calculos";
import { PRIORIDADE_BADGE, PRIORIDADE_LABEL, STATUS_LABEL } from "@/lib/demanda-ui";
import { dataBr, numeroOs } from "@/lib/novidades/formato";
import type { Enums } from "@/lib/database.types";
import { Kpi, cardCls, inputCls, labelCls } from "../../governanca/ui";
import { salvarRegistro } from "../registros";

export type ItemCarteira = {
  id: string;
  titulo: string;
  prioridade: Enums<"demanda_prioridade">;
  status: Enums<"demanda_status">;
  criado_em: string;
  prazo: string | null;
  local: string;
  responsavel: string | null;
  preventiva: boolean;
};

export type RegistroBacklog = {
  hp?: number | null;
  bloqueio?: string;
  proxima_acao?: string;
};

export type Capacidade = {
  tecnicos: number;
  horas: number;
  compromissos: number;
  reserva: number;
};

const BLOQUEIOS = ["", "Peça / material", "Acesso ao local", "Aprovação / orçamento", "Terceiro / fornecedor", "Outro"];

function numero(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatarHp(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function BacklogApp({
  itens,
  registros,
  capacidade,
  hoje,
}: {
  itens: ItemCarteira[];
  registros: Record<string, RegistroBacklog>;
  capacidade: Capacidade | null;
  hoje: string;
}) {
  const [regs, setRegs] = useState(registros);
  const [cap, setCap] = useState<Capacidade>(
    capacidade ?? { tecnicos: 2, horas: 40, compromissos: 0, reserva: 0 },
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"" | "executavel" | "bloqueado" | "atrasado" | "sem_hp">("");

  const linhas = useMemo(
    () =>
      itens.map((i) => {
        const r = regs[i.id] ?? {};
        const hp = typeof r.hp === "number" ? r.hp : null;
        const bloqueado = Boolean(r.bloqueio);
        const atrasado = Boolean(i.prazo && i.prazo.slice(0, 10) < hoje);
        return { ...i, hp, bloqueado, atrasado, idade: diasEntre(i.criado_em, hoje), reg: r };
      }),
    [itens, regs, hoje],
  );

  const resumo = resumoBacklog(linhas);
  const { bruta, liquida } = capacidadeLiquida(cap.tecnicos, cap.horas, cap.compromissos, cap.reserva);
  const semTotal = semanasEquivalentes(resumo.total, liquida);
  const semExec = semanasEquivalentes(resumo.executavel, liquida);
  const atrasados = linhas.filter((l) => l.atrasado).length;
  const idadeMedia = linhas.length ? Math.round(linhas.reduce((s, l) => s + l.idade, 0) / linhas.length) : 0;

  const visiveis = linhas
    .filter((l) => {
      if (filtro === "executavel") return !l.bloqueado;
      if (filtro === "bloqueado") return l.bloqueado;
      if (filtro === "atrasado") return l.atrasado;
      if (filtro === "sem_hp") return l.hp === null;
      return true;
    })
    .sort((a, b) => b.idade - a.idade);

  async function gravar(id: string, parcial: RegistroBacklog) {
    const novo = { ...(regs[id] ?? {}), ...parcial };
    setRegs((r) => ({ ...r, [id]: novo }));
    try {
      await salvarRegistro("backlog", id, novo);
      setAviso(null);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function gravarCapacidade(parcial: Partial<Capacidade>) {
    const novo = { ...cap, ...parcial };
    setCap(novo);
    try {
      await salvarRegistro("backlog_capacidade", "geral", novo);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  const semana = (v: number | null) => (v === null ? "Sem capacidade" : `${v.toLocaleString("pt-BR")} sem.`);

  return (
    <div className="space-y-5">
      {aviso && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{aviso}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Carteira total" valor={`${formatarHp(resumo.total)} HP`} cor="text-slate-800" />
        <Kpi titulo="Executável" valor={`${formatarHp(resumo.executavel)} HP`} cor="text-emerald-600" />
        <Kpi titulo="Bloqueada" valor={`${formatarHp(resumo.bloqueada)} HP`} cor="text-red-600" />
        <Kpi titulo="Semanas equivalentes" valor={semana(semTotal)} cor="text-brand-700" />
      </div>
      <p className="text-xs text-slate-500">
        {linhas.length} chamado(s) em aberto · {resumo.semEstimativa} sem estimativa de HP (não contam como zero) ·{" "}
        {atrasados} com prazo vencido · idade média {idadeMedia} dia(s) · executável em {semana(semExec)}
      </p>

      <section className={cardCls}>
        <h2 className="font-bold text-slate-800">Capacidade da equipe por semana</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {(
            [
              ["tecnicos", "Técnicos"],
              ["horas", "Horas por técnico"],
              ["compromissos", "Ausências e compromissos (HP)"],
              ["reserva", "Reserva para imprevistos (HP)"],
            ] as const
          ).map(([k, r]) => (
            <div key={k}>
              <label className={labelCls}>{r}</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={cap[k]}
                onChange={(e) => setCap((c) => ({ ...c, [k]: numero(e.target.value) }))}
                onBlur={(e) => gravarCapacidade({ [k]: numero(e.target.value) })}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Bruta: <b>{formatarHp(bruta)} HP</b> · Líquida: <b>{formatarHp(liquida)} HP/semana</b>. Semanas equivalentes =
          carga ÷ capacidade líquida. Não é prazo de conclusão: peça, acesso e prioridades mudam a programação.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["", "Todos"],
            ["executavel", "Executáveis"],
            ["bloqueado", "Bloqueados"],
            ["atrasado", "Prazo vencido"],
            ["sem_hp", "Sem HP"],
          ] as const
        ).map(([k, r]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFiltro(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filtro === k ? "bg-brand-600 text-white" : "border border-slate-300 bg-white text-slate-600"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">Local / serviço</th>
              <th className="px-2 py-2">Prioridade</th>
              <th className="px-2 py-2">HP restantes</th>
              <th className="px-2 py-2">Situação / motivo</th>
              <th className="px-2 py-2">Idade</th>
              <th className="px-2 py-2">Responsável</th>
              <th className="px-2 py-2">Próxima ação (com prazo)</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l) => (
              <tr key={l.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2">
                  <p className="text-xs text-slate-500">
                    {l.local || "Sem local"} · <span className="font-mono">{numeroOs(l.id)}</span>
                  </p>
                  <p className="text-slate-800">
                    {l.preventiva && <span className="mr-1 rounded bg-brand-50 px-1 text-xs text-brand-700">PREV</span>}
                    {l.titulo}
                  </p>
                  <p className="text-xs text-slate-500">
                    {STATUS_LABEL[l.status]}
                    {l.prazo && (
                      <span className={l.atrasado ? "font-semibold text-red-600" : ""}> · prazo {dataBr(l.prazo)}</span>
                    )}
                  </p>
                </td>
                <td className="px-2 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORIDADE_BADGE[l.prioridade]}`}>
                    {PRIORIDADE_LABEL[l.prioridade]}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={l.hp ?? ""}
                    placeholder="?"
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      const hp = v === "" ? null : numero(v);
                      if (hp !== l.hp) gravar(l.id, { hp });
                    }}
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    className={`rounded-lg border px-2 py-1 text-xs ${
                      l.bloqueado ? "border-red-300 bg-red-50 text-red-700" : "border-emerald-300 bg-emerald-50 text-emerald-700"
                    }`}
                    value={l.reg.bloqueio ?? ""}
                    onChange={(e) => gravar(l.id, { bloqueio: e.target.value })}
                  >
                    {BLOQUEIOS.map((b) => (
                      <option key={b} value={b}>
                        {b ? `Bloqueado: ${b}` : "Executável"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`px-2 py-2 text-sm ${l.idade > 30 ? "font-semibold text-red-600" : "text-slate-600"}`}>
                  {l.idade} d
                </td>
                <td className="px-2 py-2 text-slate-600">{l.responsavel ?? "—"}</td>
                <td className="px-2 py-2">
                  <input
                    defaultValue={l.reg.proxima_acao ?? ""}
                    placeholder="Ex.: comprador confirma peça até terça"
                    className="w-full min-w-[200px] rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    onBlur={(e) => {
                      if (e.target.value !== (l.reg.proxima_acao ?? "")) gravar(l.id, { proxima_acao: e.target.value });
                    }}
                  />
                </td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  Nada nesta visão.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className={cardCls}>
        <h2 className="font-bold text-slate-800">Como ler os sinais</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Carga bloqueada crescendo: dê um responsável para cada liberação (peça, acesso, aprovação).</li>
          <li>Executável crescendo sem parar: reveja a distribuição por especialidade ou reforce a equipe.</li>
          <li>Carga caindo, mas pendência crítica parada: reavalie a sequência programada.</li>
          <li>Muitos itens sem HP: faça o levantamento antes de dimensionar.</li>
          <li>Liberar uma peça passa a carga de bloqueada para executável, não reduz o total.</li>
        </ul>
      </section>
    </div>
  );
}
