"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Processo, TipoProcesso } from "@/lib/governanca";
import {
  agruparPorSetor,
  buscarPorSetor,
  type PropriedadeRef,
  type SetorChecklist,
} from "@/lib/checklist-setores";
import { ativosOuAtual } from "@/lib/propriedade-opcoes";
import { GruposPorSetor } from "../../GruposPorSetor";
import { SelectSetor } from "../../Seletores";
import { useConfirmacao } from "@/components/Confirmacao";
import { Erro, btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../ui";
import { useGravar } from "../../useGravar";
import { CampoLocal } from "./CampoLocal";
import { LinhaChecklist } from "./LinhaChecklist";

export function ProcessosApp({
  lista,
  setores,
  propriedades,
  meusSetores,
  abrirNovo = false,
  setorInicial,
}: {
  lista: (Processo & { perguntas: number })[];
  /** Todos os setores, para agrupar e mostrar o nome. */
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  /** Setores onde a pessoa cria e edita checklists (admin: todos; líder: os dele). */
  meusSetores: SetorChecklist[];
  abrirNovo?: boolean;
  /** Setor já escolhido ao abrir "Criar checklist" pela página do setor. */
  setorInicial?: string;
}) {
  const router = useRouter();
  const escrita = useGravar();
  const { supabase, erro, setErro, gravar } = escrita;
  const [confirmar, janela] = useConfirmacao();
  const [aberto, setAberto] = useState(abrirNovo);
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState(setorInicial ?? "");
  const [descricao, setDescricao] = useState("");
  const [usaAcomodacao, setUsaAcomodacao] = useState(false);
  const [tipo, setTipo] = useState<TipoProcesso>("ambos");
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");

  const grupos = agruparPorSetor(
    buscarPorSetor(
      lista.filter((p) => !filtroSetor || p.setor_id === filtroSetor),
      busca,
      setores,
      propriedades,
    ),
    setores,
    propriedades,
  );

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    if (!setorId) return setErro("Escolha o setor do checklist.");
    setSalvando(true);
    // Guarda o id criado para abrir o editor do checklist logo em seguida.
    let id: string | undefined;
    const ok = await gravar(
      supabase
        .from("gov_processos")
        .insert({
          nome: nome.trim(),
          setor_id: setorId,
          descricao: descricao.trim() || null,
          usa_acomodacao: usaAcomodacao,
          tipo: usaAcomodacao ? tipo : "ambos",
        })
        .select("id")
        .single()
        .then((r) => {
          id = r.data?.id;
          return r;
        }),
      {},
      { recarregar: false },
    );
    setSalvando(false);
    if (ok && id) router.push(`/governanca/admin/processos/${id}`);
  }


  return (
    <>
      {janela}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Gerenciar checklists</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {lista.length} checklists, organizados por propriedade e setor.
          </p>
        </div>
        {meusSetores.length > 0 && (
          <button type="button" onClick={() => setAberto((v) => !v)} className={btnPrimario}>
            + Criar checklist
          </button>
        )}
      </div>

      {aberto && meusSetores.length > 0 && (
        <form onSubmit={adicionar} className={`${cardCls} mb-6 space-y-3`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Nome do checklist</span>
              <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Revisão diária de suítes" />
            </label>
            <label className="block">
              <span className={labelCls}>Setor</span>
              <SelectSetor
                value={setorId}
                onChange={setSetorId}
                setores={ativosOuAtual(meusSetores)}
                propriedades={propriedades}
                vazio="Escolha o setor"
              />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>Descrição (opcional)</span>
            <input className={inputCls} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Breve descrição" />
          </label>
          <CampoLocal usaLocal={usaAcomodacao} onUsaLocal={setUsaAcomodacao} tipo={tipo} onTipo={setTipo} />
          <div className="flex gap-2">
            <button type="submit" className={btnPrimario} disabled={salvando}>
              Criar checklist
            </button>
            <button type="button" className={btnSecundario} onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <Erro texto={erro} />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_16rem]">
        <input
          className={inputCls}
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar checklist…"
        />
        <SelectSetor
          value={filtroSetor}
          onChange={setFiltroSetor}
          setores={meusSetores}
          propriedades={propriedades}
          vazio="Todos os setores"
        />
      </div>

      <GruposPorSetor
        grupos={grupos}
        renderItem={(p) => (
          <LinhaChecklist
            key={p.id}
            processo={p}
            setoresParaMover={meusSetores}
            propriedades={propriedades}
            escrita={escrita}
            confirmar={confirmar}
          />
        )}
      />
      {grupos.length === 0 && (
        <p className="text-sm text-slate-500">
          {lista.length ? "Nenhum checklist encontrado." : "Nenhum checklist cadastrado."}
        </p>
      )}
    </>
  );
}
