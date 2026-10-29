"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatarPercentual, percentual } from "@/lib/novidades/calculos";
import { dataBr } from "@/lib/novidades/formato";
import { Kpi, btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../governanca/ui";
import type { EquipamentoBase } from "../equipamentos";
import { salvarRegistro } from "../registros";

/** Quando o campo está vazio, o motivo (a Leankeep pede para não confundir os três). */
type Motivo = "" | "nao_informado" | "nao_aplicavel" | "nao_confirmado";

const CAMPOS = [
  { id: "sistema", rotulo: "Sistema", dica: "Função técnica: Climatização, Elétrica, Hidráulica..." },
  { id: "tipo", rotulo: "Tipo e nome padrão", dica: "Ex.: Evaporadora split hi-wall" },
  { id: "fabricante", rotulo: "Fabricante", dica: "Da placa ou do manual" },
  { id: "modelo", rotulo: "Modelo", dica: "Da placa ou do manual" },
  { id: "serie", rotulo: "Número de série", dica: "Identificação do fabricante" },
  { id: "patrimonio", rotulo: "Patrimônio", dica: "Código do controle patrimonial" },
  { id: "dado_tecnico", rotulo: "Dado técnico + unidade", dica: "Ex.: 12.000 BTU/h · 220 V" },
] as const;

type CampoId = (typeof CAMPOS)[number]["id"];

export const ESTADOS_OPERACAO = ["Em operação", "Parado", "Em manutenção", "Desativado", "Não confirmado"];
export const STATUS_CADASTRO = [
  "Identificação e área conferidas",
  "Relação pendente",
  "Placa ilegível",
  "Documentação pendente",
  "Não localizado",
  "Não confirmado",
];

export type FichaInventario = {
  valores?: Partial<Record<CampoId, string>>;
  motivos?: Partial<Record<CampoId, Motivo>>;
  estado?: string;
  status?: string;
  pendencia?: string;
  responsavel?: string;
  prazo?: string;
  conferido_em?: string;
};

function completude(f: FichaInventario | undefined) {
  let preenchidos = 0;
  let aplicaveis = 0;
  for (const c of CAMPOS) {
    if (f?.motivos?.[c.id] === "nao_aplicavel") continue;
    aplicaveis += 1;
    if ((f?.valores?.[c.id] ?? "").trim() && f?.motivos?.[c.id] !== "nao_confirmado") preenchidos += 1;
  }
  return { preenchidos, aplicaveis };
}

export function InventarioApp({
  equipamentos,
  fichas,
  hoje,
}: {
  equipamentos: EquipamentoBase[];
  fichas: Record<string, FichaInventario>;
  hoje: string;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const resumo = useMemo(() => {
    let conferidos = 0;
    let preenchidos = 0;
    let aplicaveis = 0;
    let pendentes = 0;
    for (const e of equipamentos) {
      const f = fichas[e.id];
      if (f?.status === STATUS_CADASTRO[0]) conferidos += 1;
      else pendentes += 1;
      const c = completude(f);
      preenchidos += c.preenchidos;
      aplicaveis += c.aplicaveis;
    }
    return {
      cobertura: percentual(conferidos, equipamentos.length),
      completude: percentual(preenchidos, aplicaveis),
      conferidos,
      pendentes,
    };
  }, [equipamentos, fichas]);

  const lista = equipamentos.filter((e) => {
    const q = busca.trim().toLowerCase();
    return !q || `${e.codigo} ${e.nome} ${e.area}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Equipamentos" valor={equipamentos.length} cor="text-slate-800" />
        <Kpi titulo="Conferidos" valor={resumo.conferidos} cor="text-emerald-600" />
        <Kpi titulo="Cobertura de conferência" valor={formatarPercentual(resumo.cobertura)} cor="text-brand-700" />
        <Kpi titulo="Completude dos campos" valor={formatarPercentual(resumo.completude)} cor="text-brand-700" />
      </div>
      <p className="text-xs text-slate-500">
        Cobertura = conferidos ÷ equipamentos. Completude = campos preenchidos e confirmados ÷ campos aplicáveis
        (o que está &quot;não informado&quot; continua contando no total).
      </p>

      <input
        className={inputCls}
        placeholder="Buscar por código, nome ou área..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="space-y-2">
        {lista.map((e) => {
          const f = fichas[e.id];
          const c = completude(f);
          const pct = percentual(c.preenchidos, c.aplicaveis) ?? 0;
          const aberto = editando === e.id;
          return (
            <div key={e.id} className={cardCls}>
              <button
                type="button"
                onClick={() => setEditando(aberto ? null : e.id)}
                className="flex w-full flex-wrap items-center gap-3 text-left"
              >
                <span className="font-mono text-sm font-bold text-brand-700">{e.codigo}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-800">{e.nome}</span>
                  <span className="block text-xs text-slate-500">
                    {e.area || "Sem área"} {!e.ativo && "· inativo no cadastro"}
                  </span>
                </span>
                <span className="w-28">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full bg-brand-600" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="text-[11px] text-slate-500">{Math.round(pct)}% completo</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    f?.status === STATUS_CADASTRO[0]
                      ? "bg-emerald-100 text-emerald-700"
                      : f?.status
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {f?.status ?? "Não levantado"}
                </span>
              </button>
              {aberto && (
                <FormFicha
                  equipamento={e}
                  inicial={f ?? {}}
                  hoje={hoje}
                  onFechar={() => setEditando(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FormFicha({
  equipamento,
  inicial,
  hoje,
  onFechar,
}: {
  equipamento: EquipamentoBase;
  inicial: FichaInventario;
  hoje: string;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [ficha, setFicha] = useState<FichaInventario>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function campo(id: CampoId, valor: string) {
    setFicha((f) => ({ ...f, valores: { ...f.valores, [id]: valor } }));
  }
  function motivo(id: CampoId, valor: Motivo) {
    setFicha((f) => ({ ...f, motivos: { ...f.motivos, [id]: valor } }));
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const dados = { ...ficha };
      if (dados.status === STATUS_CADASTRO[0] && !dados.conferido_em) dados.conferido_em = hoje;
      await salvarRegistro("inventario", equipamento.id, dados);
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
      <p className="text-xs text-slate-500">
        TAG (código): <b>{equipamento.codigo}</b> · Área de instalação: <b>{equipamento.area || "—"}</b>
        {equipamento.descricao && <> · {equipamento.descricao}</>}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CAMPOS.map((c) => {
          const vazio = !(ficha.valores?.[c.id] ?? "").trim();
          return (
            <div key={c.id}>
              <label className={labelCls}>{c.rotulo}</label>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder={c.dica}
                  value={ficha.valores?.[c.id] ?? ""}
                  onChange={(e) => campo(c.id, e.target.value)}
                />
                <select
                  className="w-36 shrink-0 rounded-lg border border-slate-300 bg-white px-2 text-xs"
                  value={ficha.motivos?.[c.id] ?? ""}
                  onChange={(e) => motivo(c.id, e.target.value as Motivo)}
                >
                  <option value="">{vazio ? "Não informado" : "Confirmado"}</option>
                  <option value="nao_confirmado">Não confirmado</option>
                  <option value="nao_aplicavel">Não se aplica</option>
                </select>
              </div>
            </div>
          );
        })}
        <div>
          <label className={labelCls}>Estado de operação</label>
          <select
            className={inputCls}
            value={ficha.estado ?? ""}
            onChange={(e) => setFicha((f) => ({ ...f, estado: e.target.value }))}
          >
            <option value="">—</option>
            {ESTADOS_OPERACAO.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Situação do cadastro</label>
          <select
            className={inputCls}
            value={ficha.status ?? ""}
            onChange={(e) => setFicha((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Não levantado</option>
            {STATUS_CADASTRO.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Pendência e próximo passo</label>
          <input
            className={inputCls}
            placeholder="Ex.: fotografar a placa da condensadora"
            value={ficha.pendencia ?? ""}
            onChange={(e) => setFicha((f) => ({ ...f, pendencia: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls}>Responsável</label>
          <input
            className={inputCls}
            value={ficha.responsavel ?? ""}
            onChange={(e) => setFicha((f) => ({ ...f, responsavel: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls}>Prazo</label>
          <input
            type="date"
            className={inputCls}
            value={ficha.prazo ?? ""}
            onChange={(e) => setFicha((f) => ({ ...f, prazo: e.target.value }))}
          />
        </div>
      </div>
      {ficha.conferido_em && <p className="text-xs text-slate-500">Conferido em {dataBr(ficha.conferido_em)}.</p>}
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecundario} onClick={onFechar}>
          Cancelar
        </button>
        <button type="button" className={btnPrimario} onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar ficha"}
        </button>
      </div>
    </div>
  );
}
