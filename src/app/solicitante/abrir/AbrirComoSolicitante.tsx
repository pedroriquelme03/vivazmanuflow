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
}: {
  ambiente: AmbienteEquipe;
  propriedades: { id: string; nome: string }[];
  solicitantes: { id: string; nome: string; propriedade_id: string }[];
  nomeSolicitantePadrao: string;
  propriedadePadrao: string | null;
}) {
  const router = useRouter();
  return (
    <FormAbrir
      ambiente={ambiente}
      propriedades={propriedades}
      solicitantes={solicitantes}
      eventos={[]}
      nomeSolicitantePadrao={nomeSolicitantePadrao}
      propriedadePadrao={propriedadePadrao}
      onSucesso={() => router.push("/solicitante?aba=chamados")}
    />
  );
}
