"use client";

import { useMemo, useState } from "react";
import { CATALOGO_ATIVIDADES } from "@/lib/novidades/catalogo-atividades";
import { dataBr } from "@/lib/novidades/formato";
import { somarIntervalo } from "@/lib/preventiva";
import { btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../governanca/ui";
import type { EquipamentoBase } from "../equipamentos";
import { salvarRegistro } from "../registros";

type Ambiente = {
  nome: string;
  area: string;
  atividade: string;
  fixos: string;
  flutuantes: string;
  casaMaquinas: boolean;
};

type EquipPmoc = {
  tag: string;
  tipo: string;
  marca: string;
  modelo: string;
  serie: string;
  tensao: string;
  capacidade: string;
  ambientes: string;
};

type Documento = { anexado: boolean; validade: string; obs: string };
type Contato = { nome: string; cargo: string; telefone: string; horario: string };

export type Pmoc = {
  edificio: Record<string, string>;
  tecnico: Record<string, string>;
  ambientes: Ambiente[];
  equipamentos: EquipPmoc[];
  documentos: Record<string, Documento>;
  recomendacoes: string;
  contatos: Contato[];
  primeiraAtividade: string;
};

const CAMPOS_EDIFICIO = [
  ["cnpj", "CNPJ do empreendimento"],
  ["razao", "Razão social"],
  ["fantasia", "Nome fantasia"],
  ["endereco", "Endereço"],
  ["resp_nome", "Responsável pela unidade"],
  ["resp_tel", "Telefone do responsável"],
  ["resp_doc", "CPF/CNPJ do responsável"],
] as const;

const CAMPOS_TECNICO = [
  ["nome", "Nome do responsável técnico"],
  ["cpf", "CPF"],
  ["registro", "Registro no conselho (CREA / CFT / CRT)"],
  ["art", "Número da ART ou TRT"],
  ["vigencia", "Vigência da ART/TRT"],
  ["endereco", "Endereço (CEP, cidade/UF)"],
  ["telefone", "Telefone de contato"],
] as const;

const DOCUMENTOS = [
  ["projeto", "Projeto do sistema de ar-condicionado", "Com a construtora, o escritório de projeto ou a instaladora, se tiver se perdido."],
  ["fispq", "FISPQ dos produtos químicos de limpeza", "NBR 14725. Produtos biodegradáveis e registrados no Ministério da Saúde."],
  ["ibama", "Cadastro IBAMA CTF/APP (gases refrigerantes)", "Cadastro técnico federal de atividades potencialmente poluidoras."],
  ["microbiologica", "Análise microbiológica e físico-química do ar", "Laboratório certificado (ISO/IEC 17025), periodicidade da RE-09 Anvisa."],
  ["legionella", "Análise de Legionella na água de condensação", "Laboratório com controle de qualidade para o ensaio."],
  ["art", "ART ou TRT do responsável técnico", "ART pelo CREA; TRT pelo CFT/CRT."],
] as const;

const RECOMENDACOES_PADRAO = `Nos casos de falha na operação dos equipamentos e/ou emergências no sistema de climatização, os colaboradores devem, primeiro, verificar a alimentação de energia elétrica e ruídos anormais. Se for o caso, desligar o equipamento da energia elétrica e, em seguida, comunicar o ocorrido à gerência ou ao responsável pelo estabelecimento, que tomará as medidas cabíveis.

Em caso de pane do sistema de ar-condicionado, abrir as janelas dos ambientes para a devida ventilação. Caso contrário, executar o plano de abandono.`;

const TIPOS_CLIMA = [
  ...new Set(CATALOGO_ATIVIDADES.filter((a) => a.sistema === "Climatização").map((a) => a.tipo)),
].sort((a, b) => a.localeCompare(b, "pt-BR"));

const LEIS = [
  "Lei nº 13.589, de 4 de janeiro de 2018",
  "Portaria nº 3.523/GM, de 28 de agosto de 1998",
  "Lei nº 6.437, de 20 de agosto de 1977 (infrações sanitárias: multa de R$ 2.000 a R$ 200.000)",
  "NBR 13700/96 · Classificação das áreas de contaminação controlada",
  "NBR 13971/97 · Manutenção programada de refrigeração, ar-condicionado e ventilação",
  "Resolução RE nº 09, de 16 de janeiro de 2003 (Anvisa) · Qualidade do ar",
  "NBR 16401 (partes 1 a 3) · Projeto, conforto térmico e qualidade do ar interior",
];

function vazio(): Pmoc {
  return {
    edificio: {},
    tecnico: {},
    ambientes: [],
    equipamentos: [],
    documentos: {},
    recomendacoes: RECOMENDACOES_PADRAO,
    contatos: [
      { nome: "Escritório central", cargo: "", telefone: "", horario: "2ª a 6ª, horário comercial" },
      { nome: "Equipe móvel", cargo: "", telefone: "", horario: "2ª a domingo" },
    ],
    primeiraAtividade: "",
  };
}

function btu(capacidade: string) {
  const s = capacidade.toLowerCase().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  if (s.includes("tr")) return n * 12000;
  return n;
}

function frequencia(meses: number) {
  return meses === 1 ? "Mensal" : meses === 3 ? "Trimestral" : meses === 6 ? "Semestral" : "Anual";
}

export function PmocApp({
  inicial,
  equipamentos,
  hoje,
}: {
  inicial: Pmoc | null;
  equipamentos: EquipamentoBase[];
  hoje: string;
}) {
  const [p, setP] = useState<Pmoc>({ ...vazio(), ...(inicial ?? {}) });
  const [modo, setModo] = useState<"editar" | "documento">("editar");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargaTotal = p.equipamentos.reduce((s, e) => s + btu(e.capacidade), 0);
  const validade = p.primeiraAtividade ? somarIntervalo(p.primeiraAtividade, 1, "ano") : "";
  const programacao = useMemo(() => {
    const tipos = [...new Set(p.equipamentos.map((e) => e.tipo).filter(Boolean))];
    return tipos.map((tipo) => ({
      tipo,
      tags: p.equipamentos.filter((e) => e.tipo === tipo).map((e) => e.tag || "s/ TAG"),
      atividades: CATALOGO_ATIVIDADES.filter((a) => a.tipo === tipo),
    }));
  }, [p.equipamentos]);

  function set<K extends keyof Pmoc>(k: K, v: Pmoc[K]) {
    setP((x) => ({ ...x, [k]: v }));
  }

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    try {
      await salvarRegistro("pmoc", "geral", p);
      setMsg({ ok: true, texto: "PMOC salvo." });
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : "Erro ao salvar" });
    } finally {
      setSalvando(false);
    }
  }

  const barra = (
    <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur print:hidden">
      <button
        type="button"
        className={modo === "editar" ? btnPrimario : btnSecundario}
        onClick={() => setModo("editar")}
      >
        Preencher
      </button>
      <button
        type="button"
        className={modo === "documento" ? btnPrimario : btnSecundario}
        onClick={() => setModo("documento")}
      >
        Ver documento
      </button>
      <span className="flex-1" />
      {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.texto}</span>}
      <button type="button" className={btnSecundario} onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar"}
      </button>
      {modo === "documento" && (
        <button type="button" className={btnPrimario} onClick={() => window.print()}>
          Imprimir / PDF
        </button>
      )}
    </div>
  );

  const obrigatorio = cargaTotal > 60000;
  const statusCarga = (
    <div
      className={`rounded-xl px-3 py-2 text-sm ${
        obrigatorio ? "bg-red-50 text-red-800" : cargaTotal ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"
      }`}
    >
      Carga térmica somada: <b>{cargaTotal.toLocaleString("pt-BR")} BTU/h</b> ({(cargaTotal / 12000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} TR).{" "}
      {obrigatorio
        ? "Acima de 60.000 BTU/h (5 TR): o PMOC é obrigatório."
        : "O PMOC é obrigatório acima de 60.000 BTU/h (5 TR), num equipamento ou na soma do ambiente."}
    </div>
  );

  if (modo === "documento") {
    return (
      <>
        {barra}
        <Documento p={p} cargaTotal={cargaTotal} validade={validade} programacao={programacao} hoje={hoje} />
      </>
    );
  }

  return (
    <div className="space-y-5">
      {barra}
      {statusCarga}

      <Secao n={1} titulo="Dados do edifício">
        <Grade campos={CAMPOS_EDIFICIO} valores={p.edificio} onChange={(v) => set("edificio", v)} />
      </Secao>

      <Secao n={2} titulo="Responsável técnico" dica="Engenheiro (CREA/CONFEA) ou técnico em refrigeração/eletromecânica (CFT/CRT). Os dados estão na ART ou TRT, que vai impressa no final.">
        <Grade campos={CAMPOS_TECNICO} valores={p.tecnico} onChange={(v) => set("tecnico", v)} />
      </Secao>

      <Secao n={3} titulo="Ambientes climatizados e casas de máquinas">
        <Lista
          itens={p.ambientes}
          onChange={(v) => set("ambientes", v)}
          novo={{ nome: "", area: "", atividade: "", fixos: "", flutuantes: "", casaMaquinas: false }}
          rotuloNovo="+ Ambiente"
          render={(a, up) => (
            <div className="grid gap-2 sm:grid-cols-6">
              <input className={`${inputCls} sm:col-span-2`} placeholder="Nome (ex.: Recepção)" value={a.nome} onChange={(e) => up({ nome: e.target.value })} />
              <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-4">
                <input type="checkbox" checked={a.casaMaquinas} onChange={(e) => up({ casaMaquinas: e.target.checked })} />
                Casa de máquinas (só o nome)
              </label>
              {!a.casaMaquinas && (
                <>
                  <input className={inputCls} placeholder="Área m²" value={a.area} onChange={(e) => up({ area: e.target.value })} />
                  <input className={`${inputCls} sm:col-span-3`} placeholder="Atividade (ex.: hospedagem, administrativa)" value={a.atividade} onChange={(e) => up({ atividade: e.target.value })} />
                  <input className={inputCls} placeholder="Ocup. fixos" value={a.fixos} onChange={(e) => up({ fixos: e.target.value })} />
                  <input className={inputCls} placeholder="Flutuantes" value={a.flutuantes} onChange={(e) => up({ flutuantes: e.target.value })} />
                </>
              )}
            </div>
          )}
        />
      </Secao>

      <Secao n={4} titulo="Equipamentos de climatização" dica="O tipo define as atividades da programação (vêm da biblioteca da planilha). Capacidade em BTU/h ou TR.">
        {equipamentos.length > 0 && (
          <select
            className={`${inputCls} mb-3`}
            value=""
            onChange={(e) => {
              const eq = equipamentos.find((x) => x.id === e.target.value);
              if (!eq) return;
              set("equipamentos", [
                ...p.equipamentos,
                { tag: eq.codigo, tipo: "", marca: "", modelo: "", serie: "", tensao: "", capacidade: "", ambientes: eq.area },
              ]);
            }}
          >
            <option value="">Puxar de um equipamento cadastrado...</option>
            {equipamentos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} · {e.nome} ({e.area})
              </option>
            ))}
          </select>
        )}
        <Lista
          itens={p.equipamentos}
          onChange={(v) => set("equipamentos", v)}
          novo={{ tag: "", tipo: "", marca: "", modelo: "", serie: "", tensao: "", capacidade: "", ambientes: "" }}
          rotuloNovo="+ Equipamento"
          render={(eq, up) => (
            <div className="grid gap-2 sm:grid-cols-4">
              <input className={inputCls} placeholder="TAG / identificação" value={eq.tag} onChange={(e) => up({ tag: e.target.value })} />
              <select className={`${inputCls} sm:col-span-3`} value={eq.tipo} onChange={(e) => up({ tipo: e.target.value })}>
                <option value="">Tipo do equipamento...</option>
                {TIPOS_CLIMA.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <input className={inputCls} placeholder="Marca" value={eq.marca} onChange={(e) => up({ marca: e.target.value })} />
              <input className={inputCls} placeholder="Modelo (opcional)" value={eq.modelo} onChange={(e) => up({ modelo: e.target.value })} />
              <input className={inputCls} placeholder="Nº de série" value={eq.serie} onChange={(e) => up({ serie: e.target.value })} />
              <input className={inputCls} placeholder="Tensão (opcional)" value={eq.tensao} onChange={(e) => up({ tensao: e.target.value })} />
              <input className={inputCls} placeholder="Capacidade (ex.: 12000 ou 5 TR)" value={eq.capacidade} onChange={(e) => up({ capacidade: e.target.value })} />
              <input className={`${inputCls} sm:col-span-3`} placeholder="Ambientes atendidos" value={eq.ambientes} onChange={(e) => up({ ambientes: e.target.value })} />
            </div>
          )}
        />
      </Secao>

      <Secao n={5} titulo="Programação de atividades" dica="Gerada pelos tipos de equipamento. A frequência é a recomendada; o responsável técnico revisa e não pode passar do limite da RE-09 Anvisa (NBR 13971).">
        {programacao.length === 0 ? (
          <p className="text-sm text-slate-500">Escolha o tipo dos equipamentos para gerar a programação.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {programacao.map((g) => (
              <li key={g.tipo}>
                <b>{g.tipo}</b> ({g.tags.join(", ")}): {g.atividades.length} atividades
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 max-w-xs">
          <label className={labelCls}>Data da primeira atividade</label>
          <input type="date" className={inputCls} value={p.primeiraAtividade} onChange={(e) => set("primeiraAtividade", e.target.value)} />
          {validade && (
            <p className={`mt-1 text-xs ${validade <= hoje ? "font-semibold text-red-600" : "text-slate-500"}`}>
              Validade do PMOC: até {dataBr(validade)} (1 ano a partir da primeira atividade).
            </p>
          )}
        </div>
      </Secao>

      <Secao n={6} titulo="Documentos exigidos (anexar ao PMOC impresso)">
        <ul className="space-y-3">
          {DOCUMENTOS.map(([id, nome, dica]) => {
            const d = p.documentos[id] ?? { anexado: false, validade: "", obs: "" };
            const up = (parcial: Partial<Documento>) =>
              set("documentos", { ...p.documentos, [id]: { ...d, ...parcial } });
            const vencido = d.validade && d.validade < hoje;
            return (
              <li key={id} className="rounded-xl border border-slate-200 p-3">
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={d.anexado} onChange={(e) => up({ anexado: e.target.checked })} />
                  <span>
                    <span className="font-medium text-slate-800">{nome}</span>
                    <span className="block text-xs text-slate-500">{dica}</span>
                  </span>
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input type="date" className={inputCls} value={d.validade} onChange={(e) => up({ validade: e.target.value })} title="Validade" />
                  <input className={`${inputCls} sm:col-span-2`} placeholder="Observação / onde está" value={d.obs} onChange={(e) => up({ obs: e.target.value })} />
                </div>
                {vencido && <p className="mt-1 text-xs font-semibold text-red-600">Vencido em {dataBr(d.validade)}</p>}
              </li>
            );
          })}
        </ul>
      </Secao>

      <Secao n={7} titulo="Recomendações em caso de falha e emergência" dica="Obrigatório (Portaria 3.523/GM art. 6º e NBR 13971). Inclua nomes, cargos e telefones.">
        <textarea rows={7} className={inputCls} value={p.recomendacoes} onChange={(e) => set("recomendacoes", e.target.value)} />
        <p className="mb-2 mt-3 text-sm font-medium text-slate-700">Contatos para emergência</p>
        <Lista
          itens={p.contatos}
          onChange={(v) => set("contatos", v)}
          novo={{ nome: "", cargo: "", telefone: "", horario: "" }}
          rotuloNovo="+ Contato"
          render={(c, up) => (
            <div className="grid gap-2 sm:grid-cols-4">
              <input className={inputCls} placeholder="Nome / setor" value={c.nome} onChange={(e) => up({ nome: e.target.value })} />
              <input className={inputCls} placeholder="Cargo" value={c.cargo} onChange={(e) => up({ cargo: e.target.value })} />
              <input className={inputCls} placeholder="Telefone" value={c.telefone} onChange={(e) => up({ telefone: e.target.value })} />
              <input className={inputCls} placeholder="Horário" value={c.horario} onChange={(e) => up({ horario: e.target.value })} />
            </div>
          )}
        />
      </Secao>

      <section className={cardCls}>
        <h2 className="font-bold text-slate-800">Depois de gerar o PMOC</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Em cada atividade feita, registre a data, a medição (quando for de medição), o técnico que executou e o supervisor, com visto ou assinatura. No Manuflow isso fica no chamado da preventiva.</li>
          <li>O PMOC fica impresso no edifício, com os documentos anexados, e é atualizado como um diário.</li>
          <li>Ausência do PMOC é infração sanitária (Lei 6.437): multa de R$ 2.000 a R$ 200.000.</li>
        </ul>
      </section>
    </div>
  );
}

function Secao({ n, titulo, dica, children }: { n: number; titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className={cardCls}>
      <h2 className="font-bold text-slate-800">
        {n}. {titulo}
      </h2>
      {dica && <p className="mt-0.5 text-xs text-slate-500">{dica}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Grade({
  campos,
  valores,
  onChange,
}: {
  campos: readonly (readonly [string, string])[];
  valores: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {campos.map(([k, r]) => (
        <div key={k}>
          <label className={labelCls}>{r}</label>
          <input className={inputCls} value={valores[k] ?? ""} onChange={(e) => onChange({ ...valores, [k]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

function Lista<T>({
  itens,
  onChange,
  novo,
  rotuloNovo,
  render,
}: {
  itens: T[];
  onChange: (v: T[]) => void;
  novo: T;
  rotuloNovo: string;
  render: (item: T, up: (parcial: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {itens.map((item, i) => (
        <div key={i} className="flex gap-2 rounded-xl border border-slate-200 p-2">
          <div className="min-w-0 flex-1">
            {render(item, (parcial) => onChange(itens.map((x, j) => (j === i ? { ...x, ...parcial } : x))))}
          </div>
          <button
            type="button"
            aria-label="Remover"
            className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
            onClick={() => onChange(itens.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => onChange([...itens, novo])}>
        {rotuloNovo}
      </button>
    </div>
  );
}

function Documento({
  p,
  cargaTotal,
  validade,
  programacao,
  hoje,
}: {
  p: Pmoc;
  cargaTotal: number;
  validade: string;
  programacao: { tipo: string; tags: string[]; atividades: typeof CATALOGO_ATIVIDADES }[];
  hoje: string;
}) {
  const h3 = "mb-2 mt-6 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide text-brand-800";
  const linha = (r: string, v: string | undefined) => (
    <p key={r} className="text-sm">
      <span className="text-slate-500">{r}: </span>
      {v || "________________"}
    </p>
  );
  return (
    <article className="rounded-2xl border border-slate-300 bg-white p-6 text-slate-800 shadow-sm print:border-0 print:p-0 print:shadow-none">
      <header className="border-b-2 border-[#063b45] pb-3 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">Portaria nº 3.523/GM · Lei nº 13.589/2018</p>
        <h1 className="text-xl font-bold">Plano de Manutenção, Operação e Controle (PMOC)</h1>
        <p className="text-sm text-slate-600">
          {p.edificio.fantasia || p.edificio.razao || "Empreendimento"} · emitido em {dataBr(hoje)}
          {validade && ` · válido até ${dataBr(validade)}`}
        </p>
      </header>

      <h3 className={h3}>1. Identificação do edifício</h3>
      <div className="grid gap-x-6 sm:grid-cols-2 print:grid-cols-2">
        {CAMPOS_EDIFICIO.map(([k, r]) => linha(r, p.edificio[k]))}
      </div>

      <h3 className={h3}>2. Responsável técnico</h3>
      <div className="grid gap-x-6 sm:grid-cols-2 print:grid-cols-2">
        {CAMPOS_TECNICO.map(([k, r]) => linha(r, p.tecnico[k]))}
      </div>

      <h3 className={h3}>3. Ambientes climatizados</h3>
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="p-1">Ambiente</th>
            <th className="p-1">Área (m²)</th>
            <th className="p-1">Atividade</th>
            <th className="p-1">Ocup. fixos</th>
            <th className="p-1">Flutuantes</th>
          </tr>
        </thead>
        <tbody>
          {p.ambientes.map((a, i) => (
            <tr key={i} className="border-t border-slate-200">
              <td className="p-1">{a.nome}{a.casaMaquinas && " (casa de máquinas)"}</td>
              <td className="p-1">{a.casaMaquinas ? "—" : a.area}</td>
              <td className="p-1">{a.casaMaquinas ? "—" : a.atividade}</td>
              <td className="p-1">{a.casaMaquinas ? "—" : a.fixos}</td>
              <td className="p-1">{a.casaMaquinas ? "—" : a.flutuantes}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className={h3}>4. Equipamentos de climatização</h3>
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="p-1">TAG</th>
            <th className="p-1">Tipo</th>
            <th className="p-1">Marca / modelo</th>
            <th className="p-1">Série</th>
            <th className="p-1">Tensão</th>
            <th className="p-1">Capacidade</th>
            <th className="p-1">Ambientes atendidos</th>
          </tr>
        </thead>
        <tbody>
          {p.equipamentos.map((e, i) => (
            <tr key={i} className="border-t border-slate-200">
              <td className="p-1 font-mono">{e.tag}</td>
              <td className="p-1">{e.tipo}</td>
              <td className="p-1">{[e.marca, e.modelo].filter(Boolean).join(" / ")}</td>
              <td className="p-1">{e.serie}</td>
              <td className="p-1">{e.tensao}</td>
              <td className="p-1">{e.capacidade}</td>
              <td className="p-1">{e.ambientes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-slate-500">
        Carga térmica total: {cargaTotal.toLocaleString("pt-BR")} BTU/h ({(cargaTotal / 12000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} TR).
      </p>

      <h3 className={h3}>5. Programação de atividades (NBR 13971 / RE-09 Anvisa)</h3>
      {programacao.map((g) => (
        <div key={g.tipo} className="mb-3 break-inside-avoid">
          <p className="text-sm font-semibold">
            {g.tipo} <span className="font-normal text-slate-500">· {g.tags.join(", ")}</span>
          </p>
          <table className="w-full text-xs">
            <tbody>
              {g.atividades.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="p-1">{a.atividade}</td>
                  <td className="w-20 p-1 text-slate-500">{a.categoria}</td>
                  <td className="w-20 p-1 text-slate-500">{frequencia(a.meses)}</td>
                  <td className="w-28 p-1 text-slate-400">data / técnico / visto</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <h3 className={h3}>6. Documentos anexos</h3>
      <ul className="space-y-0.5 text-sm">
        {DOCUMENTOS.map(([id, nome]) => {
          const d = p.documentos[id];
          return (
            <li key={id}>
              [{d?.anexado ? "X" : " "}] {nome}
              {d?.validade && ` · validade ${dataBr(d.validade)}`}
              {d?.obs && ` · ${d.obs}`}
            </li>
          );
        })}
      </ul>

      <h3 className={h3}>7. Recomendações nos casos de falhas e emergências</h3>
      <p className="whitespace-pre-line text-sm">{p.recomendacoes}</p>
      <p className="mt-2 text-sm font-semibold">Para emergências, recorrer aos contatos:</p>
      <ul className="text-sm">
        {p.contatos.map((c, i) => (
          <li key={i}>
            ➜ {c.nome}
            {c.cargo && ` (${c.cargo})`}: {c.telefone || "(xx) xxxxx-xxxx"} · {c.horario}
          </li>
        ))}
      </ul>

      <h3 className={h3}>Legislação de referência</h3>
      <ul className="list-disc pl-5 text-xs text-slate-600">
        {LEIS.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>

      <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
        <div>
          <div className="mb-1 h-10 border-b border-slate-500" />
          {p.tecnico.nome || "Responsável técnico"} · {p.tecnico.registro || "registro"}
        </div>
        <div>
          <div className="mb-1 h-10 border-b border-slate-500" />
          {p.edificio.resp_nome || "Responsável pela unidade"}
        </div>
      </div>
    </article>
  );
}
