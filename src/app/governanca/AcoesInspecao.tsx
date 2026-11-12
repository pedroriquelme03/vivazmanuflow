"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { acoesInspecao } from "@/lib/checklist-inspecao";
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
  const pode = acoesInspecao(inspecao, { id: eu, cuidaDoSetor });
  if (!Object.values(pode).some(Boolean)) return null;

  const mudarStatus = (status: "pausada" | "cancelada") =>
    gravar(supabase.from("gov_inspecoes").update({ status }).eq("id", inspecao.id));

  async function excluir() {
    if (!confirm("Excluir este checklist e todas as respostas dele? Não dá para desfazer.")) return;
    const ok = await gravar(supabase.from("gov_inspecoes").delete().eq("id", inspecao.id), {}, { recarregar: false });
    if (ok) {
      router.replace(depoisDeExcluir);
      router.refresh();
    }
  }

  return (
    <div className="mb-4">
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
            onClick={() => confirm("Cancelar este checklist? Ele fica no histórico como cancelado.") && mudarStatus("cancelada")}
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
