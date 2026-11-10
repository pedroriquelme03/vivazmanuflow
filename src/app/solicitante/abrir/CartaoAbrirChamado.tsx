import { BrandMark } from "@/components/BrandMark";
import { ROTULO_PAINEL, type AmbienteEquipe } from "@/lib/ambiente-equipe";
import { AbrirComoSolicitante } from "./AbrirComoSolicitante";

type Opcao = { id: string; nome: string };

/** Cartão "Abrir chamado de TI/Manutenção" (solicitante e /chamados/abrir). */
export function CartaoAbrirChamado({
  ambiente,
  nome,
  propriedadePadrao,
  propriedades,
  solicitantes,
  sistemas,
  destino,
  className = "",
}: {
  ambiente: AmbienteEquipe;
  /** Nome do usuário logado: o chamado fica no nome dele. */
  nome: string;
  propriedadePadrao: string | null;
  propriedades: Opcao[];
  solicitantes: (Opcao & { propriedade_id: string })[];
  sistemas: Opcao[];
  /** Para onde ir depois de abrir. */
  destino?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-5 text-center">
        <BrandMark className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30" />
        <h1 className="text-xl font-bold">Abrir chamado de {ROTULO_PAINEL[ambiente]}</h1>
        <p className="mt-1 text-sm text-slate-500">O chamado fica no seu nome.</p>
      </div>
      <AbrirComoSolicitante
        ambiente={ambiente}
        propriedades={propriedades}
        solicitantes={solicitantes}
        nomeSolicitantePadrao={nome}
        propriedadePadrao={propriedadePadrao}
        sistemas={sistemas}
        destino={destino}
      />
    </div>
  );
}
