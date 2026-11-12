"use server";

import { revalidatePath } from "next/cache";
import { getPerfil } from "@/lib/auth";
import {
  ambientesDoCadastro,
  ambientesFinais,
  pessoaDoSistema,
  sistemasDoLider,
  validarCadastroLider,
  type CadastroLider,
} from "@/lib/equipe-lider";
import { garantirSolicitantesGestor } from "@/lib/solicitante-gestor";
import { createServiceClient } from "@/lib/supabase/service";

export type ResultadoLider = { erro: string } | { ok: string };

/** Só líder ativo da Manutenção ou da TI. Tudo é conferido aqui antes da chave de serviço. */
async function liderDoSistema() {
  const perfil = await getPerfil();
  if (!perfil || !perfil.ativo || perfil.role !== "lider") return null;
  const sistemas = sistemasDoLider(perfil.ambientes);
  return sistemas.length ? { perfil, sistemas } : null;
}

const SEM_PERMISSAO = "Só o líder da Manutenção ou da TI cadastra por aqui.";

/** Líder cria colaborador ou solicitante do próprio sistema. */
export async function criarPessoaLider(dados: CadastroLider): Promise<ResultadoLider> {
  const lider = await liderDoSistema();
  if (!lider) return { erro: SEM_PERMISSAO };
  const erro = validarCadastroLider(dados, lider.sistemas, true);
  if (erro) return { erro };

  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  const servico = createServiceClient();
  const { data: criado, error } = await servico.auth.admin.createUser({
    email,
    password: dados.senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error || !criado.user) {
    return {
      erro: /already|registered|exists/i.test(error?.message ?? "")
        ? `Já existe alguém com o e-mail ${email}.`
        : `Não deu para criar o login: ${error?.message ?? "erro desconhecido"}.`,
    };
  }

  const { error: erroPerfil } = await servico.from("usuarios").upsert({
    id: criado.user.id,
    nome,
    email,
    role: dados.role as "colaborador" | "solicitante",
    ambientes: ambientesDoCadastro(dados),
    propriedade_id: dados.propriedadeId || null,
    ativo: true,
  });
  if (erroPerfil) {
    await servico.auth.admin.deleteUser(criado.user.id);
    return { erro: `Não deu para gravar o perfil: ${erroPerfil.message}.` };
  }

  if (dados.role === "solicitante") {
    const { data: propriedades } = await servico.from("propriedades").select("*");
    await garantirSolicitantesGestor(servico, { nome, propriedadeId: dados.propriedadeId || null, propriedades: propriedades ?? [] });
  }

  revalidatePath("/admin");
  return { ok: `Usuário ${email} criado.` };
}

/** Líder edita alguém do próprio sistema: nome, e-mail, local, situação, sistema e senha. */
export async function salvarPessoaLider(
  id: string,
  dados: CadastroLider & { ativo: boolean },
): Promise<ResultadoLider> {
  const lider = await liderDoSistema();
  if (!lider) return { erro: SEM_PERMISSAO };
  if (id === lider.perfil.id) return { erro: "Seu próprio cadastro quem muda é o administrador." };

  const servico = createServiceClient();
  const { data: alvo } = await servico.from("usuarios").select("id, role, ambientes, email").eq("id", id).maybeSingle();
  if (!alvo || !pessoaDoSistema(alvo, lider.sistemas)) return { erro: "Essa pessoa não é do seu sistema." };
  // O papel não muda por aqui: o líder não promove ninguém.
  const erro = validarCadastroLider({ ...dados, role: alvo.role }, lider.sistemas, false);
  if (erro) return { erro };

  const email = dados.email.trim().toLowerCase();
  const ambientes =
    alvo.role === "solicitante" ? alvo.ambientes : ambientesFinais(alvo.ambientes, dados.ambientes, lider.sistemas);
  if (!ambientes.length) return { erro: "Marque pelo menos um sistema." };

  const login: { email?: string; password?: string } = {};
  if (email !== (alvo.email ?? "").toLowerCase()) login.email = email;
  if (dados.senha) login.password = dados.senha;
  if (Object.keys(login).length) {
    const { error } = await servico.auth.admin.updateUserById(id, { ...login, ...(login.email ? { email_confirm: true } : {}) });
    if (error) return { erro: `Login: ${error.message}` };
  }

  const { error: erroPerfil } = await servico
    .from("usuarios")
    .update({
      nome: dados.nome.trim(),
      email,
      ambientes: ambientes as ("manutencao" | "ti" | "checklist")[],
      propriedade_id: dados.propriedadeId || null,
      ativo: dados.ativo,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (erroPerfil) return { erro: erroPerfil.message };

  revalidatePath("/admin");
  return { ok: `${dados.nome.trim()} atualizado.` };
}
