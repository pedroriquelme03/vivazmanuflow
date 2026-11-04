"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/demanda-ui";
import type { ChamadoPendente } from "@/lib/envio-chamado";
import {
  aoEnviarDaFila,
  aoMudarFila,
  chaveEnviandoAgora,
  listarFila,
  processarFila,
  removerDaFila,
} from "@/lib/fila-offline";

const INTERVALO_MS = 30_000;

/** Chamados guardados neste aparelho, atualizados quando a fila muda. */
function useFila() {
  const [itens, setItens] = useState<ChamadoPendente[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const ler = () =>
      listarFila()
        .then((lista) => {
          if (!ativo) return;
          setItens(lista);
          setEnviando(chaveEnviandoAgora());
        })
        .catch(() => {});
    ler();
    const parar = aoMudarFila(ler);
    return () => {
      ativo = false;
      parar();
    };
  }, []);

  return { itens, enviando };
}

/**
 * Caixa de saída global: envia a fila quando a internet volta e mostra
 * quantos chamados estão esperando, como no e-mail.
 */
export function FilaEnvio() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const { itens, enviando } = useFila();
  const [aberto, setAberto] = useState(false);
  const [enviado, setEnviado] = useState<string | null>(null);

  const tentar = useCallback(() => {
    processarFila(supabase).catch(() => {});
  }, [supabase]);

  useEffect(() => {
    tentar();
    window.addEventListener("online", tentar);
    return () => window.removeEventListener("online", tentar);
  }, [tentar]);

  useEffect(() => {
    if (itens.length === 0) return;
    const timer = window.setInterval(tentar, INTERVALO_MS);
    return () => window.clearInterval(timer);
  }, [itens.length, tentar]);

  useEffect(
    () =>
      aoEnviarDaFila((titulo) => {
        setEnviado(titulo);
        router.refresh();
      }),
    [router],
  );

  useEffect(() => {
    if (!enviado) return;
    const timer = window.setTimeout(() => setEnviado(null), 4000);
    return () => window.clearTimeout(timer);
  }, [enviado]);

  async function descartar(item: ChamadoPendente) {
    if (!window.confirm(`Descartar o chamado "${item.titulo}"? Ele não será enviado.`)) {
      return;
    }
    await removerDaFila(item.chave).catch(() => {});
  }

  if (itens.length === 0 && !enviado) return null;

  const total = itens.length;
  const resumo = enviando
    ? "Enviando chamado…"
    : `${total} ${total === 1 ? "chamado aguardando" : "chamados aguardando"} conexão`;

  return (
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
      <div className="w-full max-w-md">
        {aberto && total > 0 && (
          <div className="mb-2 max-h-[50dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <p className="px-1 pb-2 text-xs font-semibold text-slate-500">
              Ficam neste aparelho e sobem sozinhos quando a internet voltar.
            </p>
            <ul className="grid gap-2">
              {itens.map((item) => (
                <li key={item.chave} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-800">{item.titulo}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.chave === enviando ? "Enviando…" : `Guardado em ${formatarData(item.criadoEm)}`}
                  </p>
                  {item.ultimoErro && (
                    <p className="mt-1 text-xs text-red-600">{item.ultimoErro}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={tentar}
                      disabled={Boolean(enviando)}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Tentar agora
                    </button>
                    <button
                      type="button"
                      onClick={() => descartar(item)}
                      disabled={item.chave === enviando}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-60"
                    >
                      Descartar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {total > 0 ? (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            <span aria-hidden>{enviando ? "↻" : "⏳"}</span>
            {resumo}
          </button>
        ) : (
          <p className="rounded-full bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg">
            ✓ Chamado enviado: {enviado}
          </p>
        )}
      </div>
    </div>
  );
}

/** Cards "Aguardando conexão" no topo de Meus chamados. */
export function ChamadosNaFila({ ambiente }: { ambiente: "manutencao" | "ti" }) {
  const { itens, enviando } = useFila();
  const daLista = itens.filter((item) => item.ambiente === ambiente);
  if (daLista.length === 0) return null;

  return (
    <div className="mt-5 grid gap-3">
      {daLista.map((item) => (
        <div
          key={item.chave}
          className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4"
        >
          <p className="text-sm font-semibold text-slate-900">{item.titulo}</p>
          <p className="mt-1 text-xs text-slate-500">{item.sublocal || "—"}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              {item.chave === enviando ? "Enviando…" : "⏳ Aguardando conexão"}
            </span>
            <span className="text-[11px] text-slate-400">{formatarData(item.criadoEm)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
