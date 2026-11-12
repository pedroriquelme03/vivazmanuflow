"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  jaExisteSetor,
  limparNome,
  nomeRepetido,
  setoresPorPropriedade,
  type PropriedadeRef,
  type SetorChecklist,
} from "@/lib/checklist-setores";
import { idPrimeiraPropriedadeAtiva } from "@/lib/propriedade-opcoes";
import { SelectPropriedade } from "../../Seletores";
import { Erro, Titulo, Voltar, btnPrimario, cardCls, inputCls, labelCls } from "../../ui";
import { useGravar } from "../../useGravar";

type SetorComUso = SetorChecklist & { checklists: number; colaboradores: number; pessoas: number };

/** Setores por propriedade. Cada cartão abre a página do setor (checklists e quem acessa). */
export function SetoresApp({ setores, propriedades }: { setores: SetorComUso[]; propriedades: PropriedadeRef[] }) {
  const { supabase, erro, setErro, gravar } = useGravar();
  const [propriedadeId, setPropriedadeId] = useState(idPrimeiraPropriedadeAtiva(propriedades));
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Propriedade desativada só aparece se ainda tiver setores.
  const grupos = useMemo(
    () => setoresPorPropriedade(setores, propriedades, true).filter((g) => g.propriedade.ativo || g.setores.length),
    [setores, propriedades],
  );

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo || !propriedadeId) return;
    if (nomeRepetido(limpo, setores.filter((s) => s.propriedade_id === propriedadeId))) {
      return setErro(jaExisteSetor(limpo));
    }
    setSalvando(true);
    const ok = await gravar(supabase.from("gov_setores").insert({ propriedade_id: propriedadeId, nome: limpo }), {
      "23505": jaExisteSetor(limpo),
    });
    setSalvando(false);
    if (ok) setNome("");
  }

  return (
    <>
      <Voltar href="/governanca/admin/cadastros">Cadastros</Voltar>
      <Titulo
        titulo="Setores"
        subtitulo="Cada propriedade tem seus setores. Abra um setor para ver e organizar os checklists dele e escolher quem acessa."
      />

      <form onSubmit={adicionar} className={`${cardCls} mb-6 grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end`}>
        <label className="block">
          <span className={labelCls}>Propriedade</span>
          <SelectPropriedade value={propriedadeId} onChange={setPropriedadeId} propriedades={propriedades} />
        </label>
        <label className="block">
          <span className={labelCls}>Novo setor</span>
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Governança" />
        </label>
        <button type="submit" className={btnPrimario} disabled={salvando || !nome.trim()}>
          + Adicionar
        </button>
      </form>

      <Erro texto={erro} />

      {grupos.map((g) => (
        <section key={g.propriedade.id} className="mb-8">
          <h2 className="mb-3 text-sm font-bold text-slate-700">
            {g.propriedade.nome} · {g.setores.length} {g.setores.length === 1 ? "setor" : "setores"}
          </h2>
          {g.setores.length === 0 && <p className="text-sm text-slate-500">Nenhum setor cadastrado.</p>}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.setores.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/governanca/admin/setores/${s.id}`}
                  className={`flex h-full flex-col rounded-2xl border p-4 shadow-sm transition hover:border-brand-400 hover:shadow ${
                    s.ativo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-800">{s.nome}</span>
                    {!s.ativo && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Inativo
                      </span>
                    )}
                  </span>
                  <span className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Numero valor={s.checklists} rotulo={s.checklists === 1 ? "checklist" : "checklists"} />
                    <Numero valor={s.colaboradores} rotulo={s.colaboradores === 1 ? "colaborador" : "colaboradores"} />
                    <Numero valor={s.pessoas} rotulo={s.pessoas === 1 ? "acessa" : "acessam"} />
                  </span>
                  <span className="mt-3 text-xs font-semibold text-brand-700">Abrir setor →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <span className="rounded-lg bg-slate-50 px-1 py-2">
      <span className="block text-lg font-bold text-slate-800">{valor}</span>
      <span className="block text-[11px] text-slate-500">{rotulo}</span>
    </span>
  );
}
