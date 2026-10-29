"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CRITERIOS_CRITICIDADE,
  classeCriticidade,
  type Classe,
  type CriterioId,
} from "@/lib/novidades/calculos";
import { dataBr } from "@/lib/novidades/formato";
import { btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../governanca/ui";
import type { EquipamentoBase } from "../equipamentos";
import { salvarRegistro } from "../registros";

export type FichaCriticidade = {
  notas?: Partial<Record<CriterioId, Classe | "">>;
  funcao?: string;
  dependencias?: string;
  consequencia?: string;
  alternativa?: string;
  evidencia?: string;
  ausentes?: string;
  justificativa?: string;
  responsavel?: string;
  revisao_gatilho?: string;
  revisao_data?: string;
  classe?: Classe | null;
  historico?: { data: string; de: string; para: string; motivo: string }[];
};

const COR: Record<string, string> = {
  A: "bg-red-600 text-white",
  B: "bg-amber-500 text-white",
  C: "bg-emerald-600 text-white",
  pendente: "bg-slate-200 text-slate-600",
};

const TEXTOS: { id: keyof FichaCriticidade; rotulo: string; dica: string }[] = [
  { id: "funcao", rotulo: "Função", dica: "Qual serviço o equipamento mantém funcionando?" },
  { id: "dependencias", rotulo: "Dependências", dica: "Ex.: mesma alimentação elétrica de outras máquinas" },
  { id: "consequencia", rotulo: "Consequência operacional", dica: "O que acontece se a função parar?" },
  { id: "alternativa", rotulo: "Alternativa disponível", dica: "Reserva, capacidade e como acionar (com evidência)" },
  { id: "evidencia", rotulo: "Evidência consultada", dica: "Documento, inspeção ou histórico, com data e período" },
  { id: "ausentes", rotulo: "Dados ausentes", dica: "Lacuna e efeito na decisão" },
  { id: "justificativa", rotulo: "Justificativa da classe", dica: "Motivo determinante" },
];

export function CriticidadeApp({
  equipamentos,
  fichas,
  hoje,
}: {
  equipamentos: EquipamentoBase[];
  fichas: Record<string, FichaCriticidade>;
  hoje: string;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const contagem = useMemo(() => {
    const c: Record<string, number> = { A: 0, B: 0, C: 0, pendente: 0 };
    for (const e of equipamentos) c[fichas[e.id]?.classe ?? "pendente"] += 1;
    return c;
  }, [equipamentos, fichas]);

  const lista = equipamentos.filter((e) => !filtro || (fichas[e.id]?.classe ?? "pendente") === filtro);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {(["A", "B", "C", "pendente"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFiltro(filtro === k ? "" : k)}
            className={`rounded-2xl border p-3 text-left shadow-sm transition ${
              filtro === k ? "border-brand-500 ring-2 ring-brand-500/30" : "border-slate-200"
            } bg-white`}
          >
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${COR[k]}`}>
              {k === "pendente" ? "Pendente" : `Classe ${k}`}
            </span>
            <p className="mt-2 text-2xl font-bold text-slate-800">{contagem[k]}</p>
          </button>
        ))}
      </div>

      {lista.map((e) => {
        const f = fichas[e.id];
        const classe = f?.classe ?? "pendente";
        const aberto = editando === e.id;
        return (
          <div key={e.id} className={cardCls}>
            <button
              type="button"
              onClick={() => setEditando(aberto ? null : e.id)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${COR[classe]}`}>
                {classe === "pendente" ? "?" : classe}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-800">
                  <span className="font-mono text-brand-700">{e.codigo}</span> · {e.nome}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {e.area} {f?.funcao ? `· ${f.funcao}` : ""}
                </span>
              </span>
              {f?.revisao_data && (
                <span className={`text-xs ${f.revisao_data <= hoje ? "font-semibold text-red-600" : "text-slate-500"}`}>
                  revisar {dataBr(f.revisao_data)}
                </span>
              )}
            </button>
            {aberto && (
              <FormCriticidade equipamento={e} inicial={f ?? {}} hoje={hoje} onFechar={() => setEditando(null)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FormCriticidade({
  equipamento,
  inicial,
  hoje,
  onFechar,
}: {
  equipamento: EquipamentoBase;
  inicial: FichaCriticidade;
  hoje: string;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState<FichaCriticidade>(inicial);
  const [motivoMudanca, setMotivoMudanca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const classe = classeCriticidade(f.notas ?? {});
  const mudou = (inicial.classe ?? null) !== classe && inicial.classe !== undefined;

  async function salvar() {
    if (mudou && !motivoMudanca.trim()) {
      setErro("A classe mudou: registre o motivo da mudança.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const historico = [...(f.historico ?? [])];
      if (mudou) {
        historico.push({
          data: hoje,
          de: inicial.classe ?? "pendente",
          para: classe ?? "pendente",
          motivo: motivoMudanca.trim(),
        });
      }
      await salvarRegistro("criticidade", equipamento.id, { ...f, classe, historico });
      onFechar();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      <div className="space-y-2">
        {CRITERIOS_CRITICIDADE.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2">
            <span className="w-48 text-sm font-medium text-slate-700">{c.rotulo}</span>
            {(["A", "B", "C"] as const).map((n) => {
              const ativo = f.notas?.[c.id] === n;
              return (
                <button
                  key={n}
                  type="button"
                  title={c[n]}
                  onClick={() => setF((x) => ({ ...x, notas: { ...x.notas, [c.id]: ativo ? "" : n } }))}
                  className={`h-9 w-11 rounded-lg text-sm font-bold transition ${
                    ativo ? COR[n] : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              );
            })}
            <span className="text-xs text-slate-500">{f.notas?.[c.id] ? c[f.notas[c.id] as Classe] : ""}</span>
          </div>
        ))}
        <p className="text-sm">
          Classe resultante:{" "}
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${COR[classe ?? "pendente"]}`}>
            {classe ?? "Pendente (falta critério)"}
          </span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TEXTOS.map((t) => (
          <div key={t.id}>
            <label className={labelCls}>{t.rotulo}</label>
            <input
              className={inputCls}
              placeholder={t.dica}
              value={(f[t.id] as string | undefined) ?? ""}
              onChange={(e) => setF((x) => ({ ...x, [t.id]: e.target.value }))}
            />
          </div>
        ))}
        <div>
          <label className={labelCls}>Responsável pela decisão</label>
          <input
            className={inputCls}
            value={f.responsavel ?? ""}
            onChange={(e) => setF((x) => ({ ...x, responsavel: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls}>Gatilho de revisão</label>
          <input
            className={inputCls}
            placeholder="Ex.: quando houver alternativa operacional"
            value={f.revisao_gatilho ?? ""}
            onChange={(e) => setF((x) => ({ ...x, revisao_gatilho: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls}>Data da próxima revisão</label>
          <input
            type="date"
            className={inputCls}
            value={f.revisao_data ?? ""}
            onChange={(e) => setF((x) => ({ ...x, revisao_data: e.target.value }))}
          />
        </div>
        {mudou && (
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Motivo da mudança ({inicial.classe ?? "pendente"} → {classe ?? "pendente"})
            </label>
            <input className={inputCls} value={motivoMudanca} onChange={(e) => setMotivoMudanca(e.target.value)} />
          </div>
        )}
      </div>

      {(f.historico ?? []).length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Histórico de mudanças</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {f.historico!.map((h, i) => (
              <li key={i}>
                {dataBr(h.data)}: {h.de} → {h.para} · {h.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecundario} onClick={onFechar}>
          Cancelar
        </button>
        <button type="button" className={btnPrimario} onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar classificação"}
        </button>
      </div>
    </div>
  );
}
