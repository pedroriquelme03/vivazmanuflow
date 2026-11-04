"use client";

import { useRouter } from "next/navigation";
import { FormAbrir } from "@/app/abrir/FormAbrir";
import type { AmbienteEquipe } from "@/lib/ambiente-equipe";

export function AbrirComoSolicitante({
  ambiente,
  propriedades,
  solicitantes,
  nomeSolicitantePadrao,
  propriedadePadrao,
  sistemas = [],
  destino = "/solicitante?aba=chamados",
}: {
  ambiente: AmbienteEquipe;
  propriedades: { id: string; nome: string }[];
  solicitantes: { id: string; nome: string; propriedade_id: string }[];
  nomeSolicitantePadrao: string;
  propriedadePadrao: string | null;
  sistemas?: { id: string; nome: string }[];
  /** Para onde ir depois de abrir o chamado. */
  destino?: string;
}) {
  const router = useRouter();
  return (
    <FormAbrir
      ambiente={ambiente}
      propriedades={propriedades}
      solicitantes={solicitantes}
      eventos={[]}
      // Projeto e evento são do quadro (líder/admin): aqui não há o que escolher.
      modoProjeto="oculto"
      mostrarEvento={false}
      nomeSolicitantePadrao={nomeSolicitantePadrao}
      propriedadePadrao={propriedadePadrao}
      sistemas={sistemas}
      onSucesso={() => router.push(destino)}
    />
  );
}
