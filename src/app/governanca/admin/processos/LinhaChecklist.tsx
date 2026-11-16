"use client";

import { useState } from "react";
import Link from "next/link";
import { rotuloAplicacao, type Processo } from "@/lib/governanca";
import { setoresPorPropriedade, type PropriedadeRef, type SetorChecklist } from "@/lib/checklist-setores";
import type { useConfirmacao } from "@/components/Confirmacao";
import { ItemMenu, MenuAcoes, TituloMenu } from "../../MenuAcoes";
import { ChaveAtivo, btnPequeno } from "../../ui";
import type { useGravar } from "../../useGravar";

/**
 * Um checklist na lista (Gerenciar checklists e página do setor): ativar e editar
 * à vista; mover para outro setor e excluir no menu "⋯", sempre com confirmação.
 */
export function LinhaChecklist({
  processo: p,
  setoresParaMover,
  propriedades,
  escrita: { supabase, gravar },
  confirmar,
}: {
  processo: Processo & { perguntas: number; onde?: string };
  /** Setores para onde a pessoa pode mover (os dela). */
  setoresParaMover: SetorChecklist[];
  propriedades: PropriedadeRef[];
  escrita: ReturnType<typeof useGravar>;
  confirmar: ReturnType<typeof useConfirmacao>[0];
}) {
  async function mudarAtivo(ativo: boolean) {
    if (
      !ativo &&
      !(await confirmar({
        titulo: `Desativar "${p.nome}"?`,
        texto: "Ele some da tela de preencher. As inspeções feitas continuam no histórico.",
        confirmar: "Desativar",
      }))
    ) {
      return;
    }
    gravar(supabase.from("gov_processos").update({ ativo }).eq("id", p.id));
  }

  async function mover(setorId: string) {
    const destino = setoresParaMover.find((s) => s.id === setorId);
    if (!destino) return;
    const ok = await confirmar({ titulo: `Mover "${p.nome}" para ${destino.nome}?`, confirmar: "Mover" });
    if (ok) gravar(supabase.from("gov_processos").update({ setor_id: setorId }).eq("id", p.id));
  }

  async function excluir() {
    const ok = await confirmar({
      titulo: `Excluir "${p.nome}"?`,
      texto: "Todas as seções e perguntas são apagadas. Se ele já foi aplicado, não dá para excluir: desative.",
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    gravar(supabase.from("gov_processos").delete().eq("id", p.id), {
      "23503": `"${p.nome}" já foi usado em inspeções. Desative em vez de excluir.`,
    });
  }

  const outrosSetores = setoresParaMover.filter((s) => s.ativo && s.id !== p.setor_id);

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 shadow-sm lg:flex-row lg:items-center ${
        p.ativo ? "bg-white" : "bg-slate-50 opacity-75"
      }`}
    >
      <Link href={`/governanca/admin/processos/${p.id}`} className="min-w-0 flex-1 hover:underline">
        <p className="font-semibold text-slate-800">{p.nome}</p>
        <p className="text-xs text-slate-500">
          {p.perguntas} {p.perguntas === 1 ? "pergunta" : "perguntas"} · {p.onde ?? rotuloAplicacao(p)}
          {p.descricao ? ` · ${p.descricao}` : ""}
        </p>
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <ChaveAtivo ativo={p.ativo} onChange={mudarAtivo} rotulo={p.nome} />
        <Link href={`/governanca/admin/processos/${p.id}`} className={btnPequeno}>
          Editar
        </Link>
        <MenuAcoes rotulo={`Mais ações de ${p.nome}`}>
          {(fechar) => (
            <MaisAcoes
              setores={outrosSetores}
              propriedades={propriedades}
              onMover={(setorId) => {
                fechar();
                mover(setorId);
              }}
              onExcluir={() => {
                fechar();
                excluir();
              }}
            />
          )}
        </MenuAcoes>
      </div>
    </div>
  );
}

/** Conteúdo do menu "⋯": as ações; "Mover" troca pela lista de setores. */
function MaisAcoes({
  setores,
  propriedades,
  onMover,
  onExcluir,
}: {
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  onMover: (setorId: string) => void;
  onExcluir: () => void;
}) {
  const [escolhendoSetor, setEscolhendoSetor] = useState(false);

  if (escolhendoSetor) {
    return (
      <>
        <ItemMenu onClick={() => setEscolhendoSetor(false)}>← Voltar</ItemMenu>
        {setoresPorPropriedade(setores, propriedades).map((g) => (
          <div key={g.propriedade.id}>
            <TituloMenu>Mover para · {g.propriedade.nome}</TituloMenu>
            {g.setores.map((s) => (
              <ItemMenu key={s.id} onClick={() => onMover(s.id)}>
                {s.nome}
              </ItemMenu>
            ))}
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {setores.length > 0 && <ItemMenu onClick={() => setEscolhendoSetor(true)}>Mover para outro setor…</ItemMenu>}
      <ItemMenu perigo onClick={onExcluir}>
        Excluir checklist
      </ItemMenu>
    </>
  );
}
