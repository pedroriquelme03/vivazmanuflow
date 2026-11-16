"use client";

import { useState } from "react";
import { caminhoLugar, type Lugar } from "@/lib/checklist-lugares";
import { EscolhaLugar } from "../../../Lugares";
import { Erro, btnPequeno, cardCls } from "../../../ui";
import { useGravar } from "../../../useGravar";

/**
 * Onde o checklist se aplica: pontos da árvore (ex.: Hospedagem › UH Suíte). Vale para
 * o ponto e tudo que está abaixo; se ele pede o local, só esses locais aparecem.
 */
export function OndeSeAplica({
  processoId,
  propriedadeId,
  pedeLocal,
  lugares,
  ligados,
}: {
  processoId: string;
  propriedadeId: string;
  pedeLocal: boolean;
  lugares: Lugar[];
  ligados: string[];
}) {
  const { supabase, erro, gravar } = useGravar();
  const [novo, setNovo] = useState("");

  async function ligar() {
    if (!novo) return;
    if (await gravar(supabase.from("gov_processo_lugares").insert({ processo_id: processoId, lugar_id: novo }), {
      "23505": "Esse ponto já está ligado.",
    })) {
      setNovo("");
    }
  }

  return (
    <section className={`${cardCls} mb-5`}>
      <h2 className="text-base font-semibold text-slate-800">Onde se aplica</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        {pedeLocal
          ? "Na hora de preencher, aparecem só os locais que ficam dentro destes pontos."
          : "Serve para organizar e filtrar. Para escolher a UH ou o local na hora, marque “Pede o local” em Editar dados."}
      </p>
      <Erro texto={erro} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ligados.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-xs font-semibold text-brand-800">
            {caminhoLugar(lugares, id) || "Ponto removido"}
            <button
              type="button"
              aria-label={`Tirar ${caminhoLugar(lugares, id)}`}
              onClick={() =>
                gravar(supabase.from("gov_processo_lugares").delete().eq("processo_id", processoId).eq("lugar_id", id))
              }
              className="flex h-5 w-5 items-center justify-center rounded-full text-brand-700 hover:bg-brand-100"
            >
              ✕
            </button>
          </span>
        ))}
        {ligados.length === 0 && (
          <span className="text-sm text-slate-500">
            Ainda não está ligado à árvore{pedeLocal ? ": usa o tipo de local antigo (Editar dados)" : ""}.
          </span>
        )}
      </div>
      <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
        <EscolhaLugar lugares={lugares} propriedadeId={propriedadeId} valor={novo} onChange={setNovo} modo="aplicacao" />
        <button type="button" className={`${btnPequeno} max-w-full`} onClick={ligar} disabled={!novo || ligados.includes(novo)}>
          + Ligar a {novo ? caminhoLugar(lugares, novo) : "este ponto"}
        </button>
      </div>
    </section>
  );
}
