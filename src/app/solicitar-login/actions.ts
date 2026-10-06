"use server";

import { createClient } from "@/lib/supabase/server";
import {
  recursoRequisicaoAusente,
  validarRequisicaoAcesso,
} from "@/lib/requisicao-acesso";

export type SolicitarState = { error?: string; ok?: boolean };

export async function solicitarAcesso(
  _prev: SolicitarState,
  formData: FormData,
): Promise<SolicitarState> {
  const nome = String(formData.get("nome") ?? "");
  const email = String(formData.get("email") ?? "");
  const setor = String(formData.get("setor") ?? "");
  const funcao = String(formData.get("funcao") ?? "");

  const falha = validarRequisicaoAcesso({ nome, email, setor, funcao });
  if (falha) return { error: falha };

  const supabase = await createClient();
  const { error } = await supabase.rpc("solicitar_acesso", {
    p_nome: nome.trim(),
    p_email: email.trim(),
    p_setor: setor.trim(),
    p_funcao: funcao.trim(),
  });
  if (error) {
    return {
      error: recursoRequisicaoAusente(error.message)
        ? "O pedido de acesso ainda não está no banco. Rode o SQL de solicitações no Supabase."
        : error.message,
    };
  }
  return { ok: true };
}
