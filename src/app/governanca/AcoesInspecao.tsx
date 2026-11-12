"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { acoesInspecao } from "@/lib/checklist-inspecao";
import { useConfirmacao } from "@/components/Confirmacao";
import { Erro, btnSecundario } from "./ui";
import { useGravar } from "./useGravar";

/**
 * Botões do checklist aplicado: continuar, pausar, cancelar e excluir, conforme
 * quem é a pessoa (quem aplicou ou quem cuida do setor). O banco confere de novo.
 */
export function AcoesInspecao({
  inspecao,
  eu,
  cuidaDoSetor,
  depoisDeExcluir,
}: {
  inspecao: { id: string; status: string; inspetor_id: string };
  eu: string;
  cuidaDoSetor: boolean;
  /** Para onde ir quando o checklist some (excluído). */
  depoisDeExcluir: string;
}) {
  const router = useRouter();
  const { supabase, erro, gravar } = useGravar();
  const [confirmar, janela] = useConfirmacao();
  const pode = acoesInspecao(inspecao, { id: eu, cuidaDoSetor });
  if (!Object.values(pode).some(Boolean)) return null;

  const mudarStatus = (status: "pausada" | "cancelada") =>
    gravar(supabase.from("gov_inspecoes").update({ status }).eq("id", inspecao.id));

  async function cancelar() {
    const ok = await confirmar({
      titulo: "Cancelar este checklist?",
      texto: "Ele para de contar como em andamento e fica no histórico como cancelado.",
      confirmar: "Cancelar checklist",
      cancelar: "Voltar",
      perigo: true,
    });
    if (ok) mudarStatus("cancelada");
  }

  async function excluir() {
    const ok = await confirmar({
      titulo: "Excluir este checklist?",
      texto: "Ele e todas as respostas dele são apagados. Não dá para desfazer.",
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    const apagou = await gravar(supabase.from("gov_inspecoes").delete().eq("id", inspecao.id), {}, { recarregar: false });
    if (apagou) {
      router.replace(depoisDeExcluir);
      router.refresh();
    }
  }

  return (
    <div className="mb-4">
      {janela}
      <Erro texto={erro} />
      <div className="flex flex-wrap gap-2">
        {pode.continuar && (
          <Link href={`/governanca/nova?continuar=${inspecao.id}`} className={`${btnSecundario} py-2`}>
            {inspecao.status === "pausada" ? "Retomar" : "Continuar"}
          </Link>
        )}
        {pode.pausar && (
          <button type="button" className={`${btnSecundario} py-2`} onClick={() => mudarStatus("pausada")}>
            Pausar
          </button>
        )}
        {pode.cancelar && (
          <button
            type="button"
            className={`${btnSecundario} py-2`}
            onClick={cancelar}
          >
            Cancelar checklist
          </button>
        )}
        {pode.excluir && (
          <button type="button" className={`${btnSecundario} py-2 text-red-700 hover:bg-red-50`} onClick={excluir}>
            Excluir
          </button>
        )}
      </div>
    </div>
  );
}
