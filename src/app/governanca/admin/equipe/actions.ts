"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import { papelGovernanca } from "@/lib/governanca";
import {
  mudancaDeSetores,
  podeMexerNoAcesso,
  podeMudarLogin,
  podeMudarPerfil,
  validarEdicaoMembro,
  validarNovoMembro,
  type EdicaoMembro,
  type MembroEquipe,
  type NovoMembro,
} from "@/lib/checklist-equipe";
import { limparNome } from "@/lib/checklist-setores";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type ResultadoCadastro = { erro: string } | { ok: string };

const SO_LIDER = "Só líder ou administrador do checklist cadastra a equipe.";

/**
 * Quem está pedindo e os setores que pode dar. Toda conferência é feita aqui,
 * no servidor, antes de usar a chave de serviço.
 */
async function quemPede() {
  const perfil = await getPerfil();
  const papel = perfil ? papelGovernanca(perfil.role, perfil.governanca_papel, perfil.ambientes) : null;
  if (!perfil || !perfil.ativo || (papel !== "admin" && papel !== "lider")) return null;
  const supabase = await createClient();
  const { data } =
    papel === "admin"
      ? await supabase.from("gov_setores").select("id")
      : await supabase.from("gov_usuario_setores").select("id:setor_id").eq("usuario_id", perfil.id);
  return { perfil, ehAdmin: papel === "admin", supabase, setores: (data ?? []).map((s) => s.id) };
}

/** Cria o login de alguém só para o Checklist; nunca cria administrador. */
export async function criarMembroChecklist(dados: NovoMembro): Promise<ResultadoCadastro> {
  const eu = await quemPede();
  if (!eu) return { erro: SO_LIDER };
  const erro = validarNovoMembro(dados, eu.setores);
  if (erro) return { erro };

  const nome = limparNome(dados.nome);
  const email = dados.email.trim().toLowerCase();
  const servico = createServiceClient();

  const { data: criado, error: erroLogin } = await servico.auth.admin.createUser({
    email,
    password: dados.senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (erroLogin || !criado.user) {
    const repetido = /already|registered|exists/i.test(erroLogin?.message ?? "");
    return {
      erro: repetido
        ? `Já existe alguém com o e-mail ${email}. Peça ao administrador para marcar o Checklist nessa pessoa.`
        : `Não deu para criar o login: ${erroLogin?.message ?? "erro desconhecido"}.`,
    };
  }

  const id = criado.user.id;
  const { error: erroPerfil } = await servico.from("usuarios").upsert({
    id,
    nome,
    email,
    role: "colaborador",
    ambientes: ["checklist"],
    governanca_papel: dados.perfil,
    avisos: [],
    ativo: true,
  });
  if (erroPerfil) {
    // Sem o perfil o login não serve para nada: desfaz para poder tentar de novo.
    await servico.auth.admin.deleteUser(id);
    return { erro: `Não deu para gravar o perfil: ${erroPerfil.message}.` };
  }

  const { error: erroSetores } = await servico
    .from("gov_usuario_setores")
    .insert(dados.setores.map((setor_id) => ({ usuario_id: id, setor_id })));

  revalidatePath("/governanca/admin/equipe");
  if (erroSetores) {
    return { erro: `Login criado, mas os setores não foram gravados (${erroSetores.message}). Marque o acesso em Editar.` };
  }
  return { ok: `${nome} já pode entrar com ${email} e a senha que você definiu.` };
}

/**
 * Salva a edição de um membro: setores (só os de quem edita) e, se puder,
 * perfil, situação e senha.
 */
export async function salvarMembroChecklist(dados: EdicaoMembro): Promise<ResultadoCadastro> {
  const eu = await quemPede();
  if (!eu) return { erro: SO_LIDER };
  const erro = validarEdicaoMembro(dados);
  if (erro) return { erro };

  const { data: equipe, error: erroEquipe } = await eu.supabase.rpc("checklist_equipe");
  if (erroEquipe) return { erro: erroEquipe.message };
  const alvo = (equipe as MembroEquipe[]).find((m) => m.id === dados.id);
  if (!alvo || !podeMexerNoAcesso(alvo, eu.perfil.id)) return { erro: "Você não pode editar essa pessoa." };

  const servico = createServiceClient();
  // Perfil e situação primeiro, depois a senha e por último os setores: se algo
  // falhar no meio, o que já foi gravado continua coerente.
  const quem = { ehAdmin: eu.ehAdmin, setores: eu.setores };
  const mudaLogin = podeMudarLogin(alvo, quem);
  if (podeMudarPerfil(alvo, quem)) {
    const { error } = await servico
      .from("usuarios")
      .update({
        governanca_papel: dados.perfil,
        ...(mudaLogin ? { ativo: dados.ativo } : {}),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", alvo.id);
    if (error) return { erro: error.message };
  }
  if (mudaLogin) {
    if (dados.senha) {
      const { error: erroSenha } = await servico.auth.admin.updateUserById(alvo.id, { password: dados.senha });
      if (erroSenha) return { erro: `Senha: ${erroSenha.message}` };
    }
  }

  const { inserir, remover } = mudancaDeSetores(alvo.setores, dados.setores, eu.setores);
  if (inserir.length) {
    const { error } = await servico
      .from("gov_usuario_setores")
      .insert(inserir.map((setor_id) => ({ usuario_id: alvo.id, setor_id })));
    if (error) return { erro: `Setores: ${error.message}` };
  }
  if (remover.length) {
    const { error } = await servico.from("gov_usuario_setores").delete().eq("usuario_id", alvo.id).in("setor_id", remover);
    if (error) return { erro: `Setores: ${error.message}` };
  }

  revalidatePath("/governanca/admin/equipe");
  return { ok: `${alvo.nome} atualizado.` };
}
