import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Prop = { id: string; ativo: boolean };

function chave(propriedadeId: string, nome: string) {
  return `${propriedadeId}::${nome.trim().toLowerCase()}`;
}

/** Evita o mesmo nome duas vezes no dropdown (cópias no banco). */
export function solicitantesUnicos<T extends { nome: string; propriedade_id: string }>(
  lista: T[],
): T[] {
  const visto = new Set<string>();
  return lista.filter((s) => {
    const k = chave(s.propriedade_id, s.nome);
    if (visto.has(k)) return false;
    visto.add(k);
    return true;
  });
}

export function idsSolicitanteDoNome<T extends { id: string; nome: string }>(
  lista: T[],
  nome: string | null | undefined,
): string[] {
  const n = nome?.trim().toLowerCase();
  if (!n) return [];
  return lista
    .filter((s) => s.nome.trim().toLowerCase() === n)
    .map((s) => s.id);
}

export function idSolicitantePorNome<
  T extends { id: string; nome: string; propriedade_id: string },
>(lista: T[], nome: string | null | undefined, propriedadeId: string): string {
  const n = nome?.trim().toLowerCase();
  if (!n || !propriedadeId) return "";
  return (
    lista.find(
      (s) =>
        s.propriedade_id === propriedadeId &&
        s.nome.trim().toLowerCase() === n,
    )?.id ?? ""
  );
}

export function normalizarNomeSolicitante(nome: string) {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export type DecisaoSolicitante =
  | { tipo: "existente"; id: string }
  | { tipo: "criar"; nome: string }
  | { tipo: "erro"; mensagem: string };

/**
 * Quem pediu o serviço no registro já concluído.
 * Nome digitado que já existe no local reaproveita o cadastro (e o setor).
 * Nome novo só cria a pessoa, sem setor. Nunca cai no usuário logado.
 */
export function decidirSolicitanteRegistro(
  lista: { id: string; nome: string; propriedade_id: string }[],
  propriedadeId: string,
  selecionadoId: string,
  nomeDigitado: string,
): DecisaoSolicitante {
  const digitado = nomeDigitado.trim();
  if (digitado) {
    const alvo = normalizarNomeSolicitante(digitado);
    const achou = lista.find(
      (s) =>
        s.propriedade_id === propriedadeId &&
        normalizarNomeSolicitante(s.nome) === alvo,
    );
    if (achou) return { tipo: "existente", id: achou.id };
    return { tipo: "criar", nome: digitado };
  }
  if (
    selecionadoId &&
    lista.some(
      (s) => s.id === selecionadoId && s.propriedade_id === propriedadeId,
    )
  ) {
    return { tipo: "existente", id: selecionadoId };
  }
  return {
    tipo: "erro",
    mensagem: "Escolha quem solicitou ou digite o nome.",
  };
}

/** Só cria se aquele nome ainda não existe naquele local. */
export async function garantirSolicitantesGestor(
  supabase: SupabaseClient<Database>,
  opts: {
    nome: string;
    propriedadeId: string | null;
    propriedades: Prop[];
  },
) {
  const nome = opts.nome.trim();
  if (!nome) return false;

  const alvos = opts.propriedadeId
    ? opts.propriedades.filter((p) => p.id === opts.propriedadeId)
    : opts.propriedades.filter((p) => p.ativo);
  if (alvos.length === 0) return false;

  const { data: existentes } = await supabase
    .from("solicitantes")
    .select("nome, propriedade_id")
    .in(
      "propriedade_id",
      alvos.map((p) => p.id),
    );

  const jaTem = new Set(
    (existentes ?? []).map((s) => chave(s.propriedade_id, s.nome)),
  );

  const novos = alvos.filter((p) => !jaTem.has(chave(p.id, nome)));
  if (novos.length === 0) return false;

  const { error } = await supabase.from("solicitantes").insert(
    novos.map((p) => ({
      nome,
      propriedade_id: p.id,
      ativo: true,
    })),
  );
  if (error) return false;
  return true;
}
