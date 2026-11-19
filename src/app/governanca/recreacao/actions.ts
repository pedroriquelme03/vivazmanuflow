"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { papelGovernanca } from "@/lib/governanca";
import { createClient } from "@/lib/supabase/server";
import { sincronizarOcupacao } from "@/lib/ocupacao-sincronizar";
import { acessoRecreacao } from "@/lib/checklist-acessos";

/** "Buscar ocupação agora": para não esperar as 13h, quem vê as métricas puxa na hora. */
export async function buscarOcupacaoAgora(): Promise<{ ok: boolean; mensagem: string }> {
  const perfil = await getPerfil();
  if (!perfil) return { ok: false, mensagem: "Entre de novo no sistema." };
  const papel = papelGovernanca(perfil.role, perfil.governanca_papel, perfil.ambientes);
  if (!papel) return { ok: false, mensagem: "Sem acesso ao Checklist." };
  const supabase = await createClient();
  const { pode } = await acessoRecreacao(supabase, perfil.id, papel);
  if (!pode) return { ok: false, mensagem: "Só o líder da Recreação pode fazer isso." };

  try {
    const { dias } = await sincronizarOcupacao();
    revalidatePath("/governanca/recreacao");
    if (!dias.length) return { ok: false, mensagem: "O painel operacional ainda não tem a ocupação de hoje." };
    const ultimo = dias[dias.length - 1];
    return {
      ok: true,
      mensagem: `Ocupação atualizada: ${ultimo.adultos} adultos e ${ultimo.criancas} crianças em ${ultimo.data.split("-").reverse().join("/")}.`,
    };
  } catch (e) {
    console.error("Falha ao buscar a ocupação", e);
    return { ok: false, mensagem: "Não deu para buscar no painel operacional agora. Tente de novo em instantes." };
  }
}
