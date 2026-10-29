"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATALOGO_ATIVIDADES, type AtividadeModelo } from "@/lib/novidades/catalogo-atividades";
import { btnPrimario, cardCls, inputCls, labelCls } from "../../governanca/ui";

type Lugar = { id: string; nome: string };

const CATEGORIA_COR: Record<string, string> = {
  Inspeção: "bg-sky-100 text-sky-800",
  Medição: "bg-violet-100 text-violet-800",
  Limpeza: "bg-emerald-100 text-emerald-800",
  Ajustes: "bg-amber-100 text-amber-800",
  Lubrificação: "bg-orange-100 text-orange-800",
};

export function rotuloMeses(meses: number) {
  if (meses === 1) return "Mensal";
  if (meses === 3) return "Trimestral";
  if (meses === 6) return "Semestral";
  if (meses === 12) return "Anual";
  return `A cada ${meses} meses`;
}

function unicos(lista: string[]) {
  return [...new Set(lista)].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function BibliotecaAtividades({ lugares, hoje }: { lugares: Lugar[]; hoje: string }) {
  const [busca, setBusca] = useState("");
  const [sistema, setSistema] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [meses, setMeses] = useState("");
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [lugarId, setLugarId] = useState(lugares[0]?.id ?? "");
  const [identificacao, setIdentificacao] = useState("");
  const [inicio, setInicio] = useState(hoje);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const sistemas = useMemo(() => unicos(CATALOGO_ATIVIDADES.map((a) => a.sistema)), []);
  const tipos = useMemo(
    () =>
      unicos(
        CATALOGO_ATIVIDADES.filter((a) => !sistema || a.sistema === sistema).map((a) => a.tipo),
      ),
    [sistema],
  );
  const categorias = useMemo(() => unicos(CATALOGO_ATIVIDADES.map((a) => a.categoria)), []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return CATALOGO_ATIVIDADES.filter(
      (a) =>
        (!sistema || a.sistema === sistema) &&
        (!tipo || a.tipo === tipo) &&
        (!categoria || a.categoria === categoria) &&
        (!meses || a.meses === Number(meses)) &&
        (!q || a.atividade.toLowerCase().includes(q) || a.tipo.toLowerCase().includes(q)),
    );
  }, [busca, sistema, tipo, categoria, meses]);

  const grupos = useMemo(() => {
    const m = new Map<string, AtividadeModelo[]>();
    for (const a of filtradas) m.set(a.tipo, [...(m.get(a.tipo) ?? []), a]);
    return [...m.entries()];
  }, [filtradas]);

  function alternar(ids: number[], marcar: boolean) {
    setMarcadas((atual) => {
      const novo = new Set(atual);
      for (const id of ids) {
        if (marcar) novo.add(id);
        else novo.delete(id);
      }
      return novo;
    });
  }

  async function criarPreventivas() {
    if (!lugarId) {
      setMsg({ ok: false, texto: "Escolha o lugar das preventivas." });
      return;
    }
    const escolhidas = CATALOGO_ATIVIDADES.filter((a) => marcadas.has(a.id));
    if (escolhidas.length === 0) return;
    setSalvando(true);
    setMsg(null);
    const ident = identificacao.trim();
    const linhas = escolhidas.map((a) => ({
      local_id: lugarId,
      titulo: `${ident || a.tipo}: ${a.atividade}`.slice(0, 300),
      descricao: [
        `Tipo do ativo: ${a.tipo}`,
        `Categoria: ${a.categoria} · Sistema: ${a.sistema}`,
        `Frequência recomendada: ${rotuloMeses(a.meses)} (modelo Leankeep)`,
      ].join("\n"),
      intervalo_quantidade: a.meses === 12 ? 1 : a.meses,
      intervalo_unidade: a.meses === 12 ? "ano" : "mes",
      proxima_abertura: inicio,
    }));
    const { error } = await createClient().from("preventivas").insert(linhas);
    setSalvando(false);
    if (error) {
      setMsg({ ok: false, texto: `Não deu para criar: ${error.message}` });
      return;
    }
    setMarcadas(new Set());
    setMsg({ ok: true, texto: `${linhas.length} preventiva(s) criada(s).` });
  }

  return (
    <div className="space-y-4">
      <div className={`${cardCls} grid gap-3 sm:grid-cols-2 lg:grid-cols-5`}>
        <div className="sm:col-span-2 lg:col-span-1">
          <label className={labelCls}>Buscar</label>
          <input
            className={inputCls}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="filtro, corrente, bandeja..."
          />
        </div>
        <div>
          <label className={labelCls}>Sistema</label>
          <select
            className={inputCls}
            value={sistema}
            onChange={(e) => {
              setSistema(e.target.value);
              setTipo("");
            }}
          >
            <option value="">Todos</option>
            {sistemas.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipo do ativo</label>
          <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos ({tipos.length})</option>
            {tipos.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <select className={inputCls} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Frequência</label>
          <select className={inputCls} value={meses} onChange={(e) => setMeses(e.target.value)}>
            <option value="">Todas</option>
            {[1, 3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {rotuloMeses(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`${cardCls} sticky top-0 z-10 space-y-3 border-brand-500/40`}>
        <p className="text-sm text-slate-700">
          <b>{marcadas.size}</b> marcada(s) de {filtradas.length} na lista.
        </p>
        {lugares.length === 0 ? (
          <p className="text-sm text-slate-600">
            Para criar preventivas, cadastre antes um lugar em{" "}
            <Link href="/lider/preventivas" className="font-semibold text-brand-700 underline">
              Preventivas
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Lugar</label>
              <select className={inputCls} value={lugarId} onChange={(e) => setLugarId(e.target.value)}>
                {lugares.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Identificação (opcional)</label>
              <input
                className={inputCls}
                value={identificacao}
                onChange={(e) => setIdentificacao(e.target.value)}
                placeholder="Ex.: Split #1, CL-014"
              />
            </div>
            <div>
              <label className={labelCls}>Primeira abertura</label>
              <input type="date" className={inputCls} value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className={`${btnPrimario} w-full`}
                disabled={salvando || marcadas.size === 0 || !inicio}
                onClick={criarPreventivas}
              >
                {salvando ? "Criando..." : `Criar ${marcadas.size || ""} preventiva(s)`}
              </button>
            </div>
          </div>
        )}
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>
            {msg.texto}{" "}
            {msg.ok && (
              <Link href="/lider/preventivas" className="font-semibold underline">
                Ver em Preventivas
              </Link>
            )}
          </p>
        )}
      </div>

      {grupos.length === 0 && <p className="text-sm text-slate-500">Nenhuma atividade com esses filtros.</p>}

      {grupos.map(([nome, lista]) => {
        const todas = lista.every((a) => marcadas.has(a.id));
        return (
          <section key={nome} className={cardCls}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-slate-800">{nome}</h2>
                <p className="text-xs text-slate-500">
                  {lista[0].sistema} · {lista.length} atividade(s)
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-brand-700 hover:underline"
                onClick={() => alternar(lista.map((a) => a.id), !todas)}
              >
                {todas ? "Desmarcar todas" : "Marcar todas"}
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {lista.map((a) => (
                <li key={a.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-brand-600"
                      checked={marcadas.has(a.id)}
                      onChange={(e) => alternar([a.id], e.target.checked)}
                    />
                    <span className="min-w-0 flex-1 text-sm text-slate-700">{a.atividade}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${CATEGORIA_COR[a.categoria] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {a.categoria}
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs text-slate-500">{rotuloMeses(a.meses)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
