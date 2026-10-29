import Link from "next/link";
import { CATALOGO_ATIVIDADES } from "@/lib/novidades/catalogo-atividades";
import { Titulo, cardCls } from "../governanca/ui";
import { exigirNovidades } from "./acesso";
import { NovidadesShell } from "./NovidadesShell";

export const dynamic = "force-dynamic";

type Ferramenta = {
  href: string;
  titulo: string;
  origem: string;
  texto: string;
  usa: string;
};

const FERRAMENTAS: Ferramenta[] = [
  {
    href: "/novidades/atividades",
    titulo: "Biblioteca de atividades",
    origem: "Planilha de manutenção preventiva",
    texto: `${CATALOGO_ATIVIDADES.length} atividades prontas por tipo de equipamento (split, chiller, fancoil, torre, VRF, bombas...), com categoria e frequência recomendada. Selecione e transforme em preventivas.`,
    usa: "Cria rotinas em Preventivas",
  },
  {
    href: "/novidades/cronograma",
    titulo: "Cronograma anual",
    origem: "Planilha (Plano de atividades + Dashboard)",
    texto: "Mês a mês, o que estava previsto e o que foi feito em cada preventiva, com % de execução e execução no prazo.",
    usa: "Lê Preventivas e chamados",
  },
  {
    href: "/novidades/ordem-servico",
    titulo: "Ordem de serviço",
    origem: "Modelo de ordem de serviço",
    texto: "Gera a OS de qualquer chamado no modelo de 14 campos, separando pedido, constatação, ação e pendência. Pronta para imprimir e assinar.",
    usa: "Lê chamados",
  },
  {
    href: "/novidades/inventario",
    titulo: "Inventário de ativos",
    origem: "Inventário de ativos",
    texto: "Dicionário de campos (TAG, fabricante, série, patrimônio, dado técnico, estado), status do cadastro e indicadores de cobertura e completude.",
    usa: "Completa os Equipamentos",
  },
  {
    href: "/novidades/criticidade",
    titulo: "Criticidade de equipamentos",
    origem: "Criticidade de equipamentos",
    texto: "Classificação A/B/C por continuidade, pessoas e recuperação. A classe é a pior nota, com justificativa, responsável e gatilho de revisão.",
    usa: "Usa os Equipamentos",
  },
  {
    href: "/novidades/backlog",
    titulo: "Backlog de manutenção",
    origem: "Backlog de manutenção",
    texto: "Carteira de chamados em aberto em horas-pessoa, executável x bloqueado, idade, próxima ação e semanas equivalentes pela capacidade da equipe.",
    usa: "Lê chamados abertos",
  },
  {
    href: "/novidades/indicadores",
    titulo: "Indicadores",
    origem: "Indicadores de manutenção predial",
    texto: "Preventiva no prazo, execução, pendências atrasadas, SLA, MTTR, MTBF e disponibilidade, cada um com a sua ficha de definição.",
    usa: "Lê chamados e Preventivas",
  },
  {
    href: "/novidades/relatorio",
    titulo: "Relatório de manutenção",
    origem: "Relatório de manutenção predial",
    texto: "Relatório de um período com recorte declarado, consolidado, serviços, pendências e checklist antes de enviar.",
    usa: "Lê chamados",
  },
  {
    href: "/novidades/pmoc",
    titulo: "PMOC",
    origem: "E-book de PMOC",
    texto: "Plano de Manutenção, Operação e Controle do ar-condicionado: dados do edifício, responsável técnico, ambientes, equipamentos, atividades, documentos e emergência.",
    usa: "Documento para imprimir",
  },
];

export default async function NovidadesPage() {
  const perfil = await exigirNovidades("/novidades");

  return (
    <NovidadesShell perfil={perfil}>
      <Titulo
        titulo="Novidades"
        subtitulo="Ferramentas trazidas dos modelos gratuitos da Leankeep (planilha, e-book e guias) para dentro do Manuflow."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {FERRAMENTAS.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`${cardCls} flex flex-col transition hover:border-brand-500 hover:shadow-md`}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold text-slate-800">{f.titulo}</h2>
              <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                Novo
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Base: {f.origem}</p>
            <p className="mt-3 flex-1 text-sm text-slate-700">{f.texto}</p>
            <p className="mt-3 text-xs font-semibold text-brand-700">{f.usa} →</p>
          </Link>
        ))}
      </div>
    </NovidadesShell>
  );
}
