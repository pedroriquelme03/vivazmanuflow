"use client";

import { useState } from "react";
import {
  limparNome,
  rotuloSetor,
  type Colaborador,
  type PropriedadeRef,
  type SetorChecklist,
} from "@/lib/checklist-setores";
import { ativosOuAtual } from "@/lib/propriedade-opcoes";
import { ListaCadastroControles, useListaCadastro } from "@/components/ListaCadastroControles";
import { SelectSetor } from "../../Seletores";
import { BotaoAtivo, Erro, Titulo, Vazio, btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../ui";
import { useGravar } from "../../useGravar";

export function ColaboradoresApp({
  lista,
  setores,
  propriedades,
  meusSetores,
}: {
  lista: Colaborador[];
  /** Todos os setores, para mostrar o nome. */
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  /** Setores onde a pessoa cadastra (admin: todos). */
  meusSetores: SetorChecklist[];
}) {
  const { supabase, erro, setErro, gravar } = useGravar();
  const setoresParaEscolher = ativosOuAtual(meusSetores);
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState(setoresParaEscolher.length === 1 ? setoresParaEscolher[0].id : "");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const rotulo = (id: string) => rotuloSetor(id, setores, propriedades);
  const controles = useListaCadastro(lista, (c) => `${c.nome} ${rotulo(c.setor_id)}`, {
    getAtivo: (c) => c.ativo,
    filtro: (c) => !filtroSetor || c.setor_id === filtroSetor,
  });

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo) return;
    if (!setorId) return setErro("Escolha o setor do colaborador.");
    setSalvando(true);
    const ok = await gravar(supabase.from("gov_camareiras").insert({ nome: limpo, setor_id: setorId }));
    setSalvando(false);
    if (ok) setNome("");
  }

  async function salvarEdicao(c: Colaborador, novoNome: string, novoSetor: string) {
    const limpo = limparNome(novoNome);
    if (!limpo || !novoSetor) return setErro("Informe o nome e o setor.");
    if (await gravar(supabase.from("gov_camareiras").update({ nome: limpo, setor_id: novoSetor }).eq("id", c.id))) {
      setEditando(null);
    }
  }

  function remover(c: Colaborador) {
    if (!confirm(`Remover ${c.nome}?`)) return;
    gravar(supabase.from("gov_camareiras").delete().eq("id", c.id), {
      "23503": `${c.nome} já aparece em checklists aplicados. Marque como inativo para manter o histórico.`,
    });
  }

  return (
    <>
      <Titulo
        titulo="Colaboradores"
        subtitulo="Quem é avaliado nos checklists (nome e setor, sem login). Na hora de aplicar, aparece só o pessoal do setor do checklist."
      />

      {setoresParaEscolher.length === 0 ? (
        <Vazio texto="Você ainda não tem setor liberado. Peça ao administrador para marcar seus setores em Setores." />
      ) : (
        <form onSubmit={adicionar} className={`${cardCls} mb-6 grid gap-3 sm:grid-cols-[1fr_16rem_auto] sm:items-end`}>
          <label className="block">
            <span className={labelCls}>Nome do colaborador</span>
            <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </label>
          <label className="block">
            <span className={labelCls}>Setor</span>
            <SelectSetor
              value={setorId}
              onChange={setSetorId}
              setores={setoresParaEscolher}
              propriedades={propriedades}
              vazio="Escolha o setor"
            />
          </label>
          <button type="submit" className={btnPrimario} disabled={salvando || !nome.trim()}>
            + Adicionar
          </button>
        </form>
      )}

      <Erro texto={erro} />

      <div className={cardCls}>
        <ListaCadastroControles
          {...controles}
          placeholder="Buscar por nome ou setor…"
          marcado={Boolean(filtroSetor)}
          filtrosExtras={
            <SelectSetor
              value={filtroSetor}
              onChange={setFiltroSetor}
              setores={meusSetores}
              propriedades={propriedades}
              vazio="Todos os setores"
            />
          }
        />
        <div className="mt-4 space-y-2">
          {controles.itens.map((c) =>
            editando === c.id ? (
              <EdicaoColaborador
                key={c.id}
                colaborador={c}
                setores={ativosOuAtual(meusSetores, c.setor_id)}
                propriedades={propriedades}
                onSalvar={(n, s) => salvarEdicao(c, n, s)}
                onCancelar={() => setEditando(null)}
              />
            ) : (
              <div
                key={c.id}
                className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 ${c.ativo ? "" : "opacity-60"}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                  {c.nome.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.nome}</span>
                  <span className="block truncate text-xs text-slate-500">{rotulo(c.setor_id)}</span>
                </span>
                <BotaoAtivo
                  ativo={c.ativo}
                  onClick={() => gravar(supabase.from("gov_camareiras").update({ ativo: !c.ativo }).eq("id", c.id))}
                />
                <button type="button" onClick={() => setEditando(c.id)} className="text-xs text-slate-400 hover:text-brand-600">
                  Editar
                </button>
                <button type="button" onClick={() => remover(c)} className="text-xs text-slate-400 hover:text-red-600">
                  Remover
                </button>
              </div>
            ),
          )}
          {lista.length === 0 && <p className="text-sm text-slate-500">Nenhum colaborador cadastrado.</p>}
        </div>
      </div>
    </>
  );
}

function EdicaoColaborador({
  colaborador,
  setores,
  propriedades,
  onSalvar,
  onCancelar,
}: {
  colaborador: Colaborador;
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  onSalvar: (nome: string, setorId: string) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(colaborador.nome);
  const [setorId, setSetorId] = useState(colaborador.setor_id);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSalvar(nome, setorId);
      }}
      className="grid gap-2 rounded-xl border border-brand-300 bg-brand-50/40 p-3 sm:grid-cols-[1fr_14rem_auto_auto]"
    >
      <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus aria-label="Nome" />
      <SelectSetor value={setorId} onChange={setSetorId} setores={setores} propriedades={propriedades} />
      <button type="submit" className={`${btnPrimario} py-2`}>
        Salvar
      </button>
      <button type="button" className={`${btnSecundario} py-2`} onClick={onCancelar}>
        Cancelar
      </button>
    </form>
  );
}
