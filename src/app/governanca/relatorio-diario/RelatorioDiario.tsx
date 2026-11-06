"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MIGRATION_HINT_GOV, erroSchemaGov } from "@/lib/governanca";
import type { Tables } from "@/lib/database.types";
import {
  MOVIMENTO_LABEL,
  dataIso,
  lerRelatorioUhs,
  uhsParaLimpar,
  type Movimento,
  type UhDoDia,
} from "@/lib/mapa-uhs";
import { Erro, Titulo, Vazio, btnPrimario, btnSecundario, cardCls } from "../ui";

type Relatorio = Tables<"gov_relatorios_diarios">;
type UhLista = Tables<"gov_relatorio_uhs">;

type Previa = { data: string; emitidoEm: string | null; uhs: UhDoDia[]; total: number };

const COR_MOVIMENTO: Record<string, string> = {
  saida: "bg-red-100 text-red-700",
  chegada: "bg-sky-100 text-sky-700",
  permanencia: "bg-amber-100 text-amber-800",
  vaga: "bg-slate-100 text-slate-600",
};

/** "2026-10-21" → "21/10/2026". */
function dataBr(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function Movimentos({ lista }: { lista: string[] }) {
  return (
    <>
      {lista.map((m) => (
        <span key={m} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COR_MOVIMENTO[m] ?? COR_MOVIMENTO.vaga}`}>
          {MOVIMENTO_LABEL[m as Movimento] ?? m}
        </span>
      ))}
    </>
  );
}

export function RelatorioDiario({
  hoje,
  podeEnviar,
  relatorio,
  uhs,
}: {
  hoje: string;
  podeEnviar: boolean;
  relatorio: Relatorio | null;
  uhs: UhLista[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [previa, setPrevia] = useState<Previa | null>(null);
  const [lendo, setLendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [soPendentes, setSoPendentes] = useState(false);
  // Marcação otimista: id → feita (até o servidor confirmar).
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});

  const feita = (u: UhLista) => marcadas[u.id] ?? Boolean(u.feita_em);
  const feitas = uhs.filter(feita).length;
  const visiveis = soPendentes ? uhs.filter((u) => !feita(u)) : uhs;
  const ehDeHoje = relatorio?.data === hoje;

  function erroBanco(error: { message: string; code?: string }) {
    setErro(erroSchemaGov(error.message, error.code) ? MIGRATION_HINT_GOV : error.message);
  }

  async function lerArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setPrevia(null);
    setLendo(true);
    try {
      const { textosDoPdf } = await import("@/lib/ler-pdf");
      const lido = lerRelatorioUhs(await textosDoPdf(arquivo));
      setPrevia({ data: lido.data, emitidoEm: lido.emitidoEm, uhs: uhsParaLimpar(lido), total: lido.uhs.length });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui ler o PDF.");
    } finally {
      setLendo(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  async function enviar() {
    if (!previa) return;
    const data = dataIso(previa.data);
    if (
      relatorio?.data === data &&
      !confirm(`Já existe um relatório de ${previa.data}. Substituir? As marcações feitas nele serão apagadas.`)
    ) {
      return;
    }
    setEnviando(true);
    setErro(null);
    // Substitui o relatório do dia: apagar a capa leva as UHs junto (cascade).
    const apagar = await supabase.from("gov_relatorios_diarios").delete().eq("data", data);
    if (apagar.error) {
      setEnviando(false);
      return erroBanco(apagar.error);
    }
    const capa = await supabase.from("gov_relatorios_diarios").insert({ data, emitido_em: previa.emitidoEm });
    if (capa.error) {
      setEnviando(false);
      return erroBanco(capa.error);
    }
    if (previa.uhs.length) {
      const linhas = await supabase.from("gov_relatorio_uhs").insert(
        previa.uhs.map((u) => ({
          data,
          numero: u.numero,
          tipo: u.tipo,
          situacao: u.situacao,
          movimentos: u.movimentos,
          tarefa: u.tarefa,
        })),
      );
      if (linhas.error) {
        setEnviando(false);
        return erroBanco(linhas.error);
      }
    }
    setEnviando(false);
    setPrevia(null);
    setMarcadas({});
    router.refresh();
  }

  async function alternar(u: UhLista) {
    const nova = !feita(u);
    setMarcadas((m) => ({ ...m, [u.id]: nova }));
    const { error } = await supabase.rpc("gov_marcar_uh_relatorio", { p_id: u.id, p_feita: nova });
    if (error) {
      setMarcadas((m) => ({ ...m, [u.id]: !nova }));
      return erroBanco(error);
    }
    router.refresh();
  }

  return (
    <>
      <Titulo
        titulo="Relatório diário"
        subtitulo="UHs que precisam ser limpas no dia, tiradas do relatório de governança do Desbravador."
      />

      <Erro texto={erro} />

      {podeEnviar && (
        <section className={`${cardCls} mb-6`}>
          <h2 className="text-sm font-semibold text-slate-800">Enviar relatório do dia</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            PDF &quot;Relatório de UHs para Governança - Resumido&quot;. A leitura é feita aqui no aparelho.
          </p>
          <input
            ref={arquivoRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => lerArquivo(e.target.files?.[0])}
          />
          <button
            type="button"
            className={`${btnSecundario} mt-3`}
            disabled={lendo || enviando}
            onClick={() => arquivoRef.current?.click()}
          >
            {lendo ? "Lendo o PDF…" : "Escolher PDF"}
          </button>

          {previa && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-700">
                Relatório de <strong>{previa.data}</strong>
                {previa.emitidoEm ? ` (tirado em ${previa.emitidoEm})` : ""}: {previa.total} UHs lidas,{" "}
                <strong>{previa.uhs.length} para limpar</strong>.
              </p>
              {dataIso(previa.data) !== hoje && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Atenção: este relatório é de {previa.data}, não de hoje ({dataBr(hoje)}).
                </p>
              )}
              <ol className="mt-3 flex flex-wrap gap-1.5">
                {previa.uhs.map((u) => (
                  <li key={u.numero} className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                    {u.numero}
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={btnPrimario} disabled={enviando} onClick={enviar}>
                  {enviando ? "Enviando…" : "Enviar para o checklist"}
                </button>
                <button type="button" className={btnSecundario} disabled={enviando} onClick={() => setPrevia(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {!relatorio ? (
        <Vazio
          texto={
            podeEnviar
              ? "Nenhum relatório enviado ainda. Escolha o PDF do dia acima."
              : "O relatório de hoje ainda não foi enviado pela liderança."
          }
        />
      ) : (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Checklist de limpeza · {dataBr(relatorio.data)}
              </h2>
              <p className="text-sm text-slate-500">
                {feitas} de {uhs.length} feitas
                {relatorio.emitido_em ? ` · relatório tirado em ${relatorio.emitido_em}` : ""}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={soPendentes}
                onChange={(e) => setSoPendentes(e.target.checked)}
                className="h-4 w-4 accent-brand-600"
              />
              Só pendentes
            </label>
          </div>

          {!ehDeHoje && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              O relatório de hoje ({dataBr(hoje)}) ainda não foi enviado. Esta lista é de {dataBr(relatorio.data)}.
            </p>
          )}

          {uhs.length > 0 && (
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${Math.round((feitas / uhs.length) * 100)}%` }}
              />
            </div>
          )}

          {visiveis.length === 0 ? (
            <Vazio texto={uhs.length ? "Todas as UHs foram feitas." : "Nenhuma UH para limpar neste relatório."} />
          ) : (
            <ul className="space-y-2">
              {visiveis.map((u) => {
                const ok = feita(u);
                return (
                  <li key={u.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:bg-slate-50 ${
                        ok ? "border-brand-200 opacity-70" : "border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={ok}
                        onChange={() => alternar(u)}
                        className="h-5 w-5 shrink-0 accent-brand-600"
                        aria-label={`UH ${u.numero} feita`}
                      />
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <span className="text-[10px] font-medium uppercase">UH</span>
                        <span className="text-sm font-bold leading-none">{u.numero}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold text-slate-800 ${ok ? "line-through" : ""}`}>
                          {u.tarefa || "Limpeza"}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <Movimentos lista={u.movimentos} />
                          {[u.tipo, u.situacao].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
