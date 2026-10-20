import Link from "next/link";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../GovernancaShell";
import { Titulo, cardCls } from "../ui";
import { Fluxograma } from "./Fluxograma";

export const dynamic = "force-dynamic";

type Etapa = {
  numero: number;
  titulo: string;
  quem: string;
  onde?: { href: string; rotulo: string; soAdmin?: boolean };
  itens: React.ReactNode[];
};

const ETAPAS: Etapa[] = [
  {
    numero: 1,
    titulo: "Liberar o acesso",
    quem: "Administrador",
    onde: { href: "/governanca/admin/equipe", rotulo: "Acessos", soAdmin: true },
    itens: [
      "Administradores do sistema já entram no módulo sem precisar de nada.",
      <>
        Para os demais, escolha em <b>Acessos</b> o papel de cada pessoa: <b>Líder</b> vê as
        inspeções de todos e escolhe a camareira nos checklists de quarto; <b>Aplicador / camareira</b>{" "}
        vê só as inspeções que fez.
      </>,
      "Quem não tem acesso não vê o item Checklists no menu.",
    ],
  },
  {
    numero: 2,
    titulo: "Cadastrar acomodações e camareiras",
    quem: "Administrador",
    onde: { href: "/governanca/admin/acomodacoes", rotulo: "Acomodações", soAdmin: true },
    itens: [
      <>
        Em <b>Acomodações</b>, cadastre cada UH com número e tipo (apartamento ou suíte). Só é
        necessário para checklists que pedem a UH.
      </>,
      <>
        Em <b>Camareiras</b>, cadastre a equipe de limpeza. O líder escolhe quem limpou o quarto, e
        os nomes aparecem como sugestão em &quot;Quem vai fazer?&quot; no plano de ação.
      </>,
      "Use Ativa/Inativa em vez de remover quem já tem inspeções, para não perder o histórico.",
    ],
  },
  {
    numero: 3,
    titulo: "Criar o checklist",
    quem: "Administrador",
    onde: { href: "/governanca/admin/processos", rotulo: "Gerenciar checklists", soAdmin: true },
    itens: [
      <>
        Em <b>Gerenciar checklists</b>, clique em <b>+ Criar checklist</b> e informe nome e
        categoria (por exemplo GOVERNANÇA, MANUTENÇÃO, AQUAMANIA). A categoria agrupa os
        checklists na hora de preencher.
      </>,
      <>
        Marque <b>Pede a acomodação (UH)</b> só quando o checklist é feito em um quarto. Nesse caso,
        escolha se vale para apartamentos, suítes ou ambos.
      </>,
      <>
        Monte as <b>seções</b> (cada seção vira uma tela no preenchimento) e adicione as{" "}
        <b>perguntas</b>. Use as setas para mudar a ordem das seções.
      </>,
      <>
        Clique no tipo ao lado de cada pergunta para configurá-la: tipo de resposta (Sim/Não,
        carinhas, texto, número, data, hora, lista de uma ou de várias opções), subárea, dica,
        obrigatória, permite N/A e se o &quot;Não&quot; abre plano de ação.
      </>,
      "Um checklist sem perguntas ou marcado como Inativo não aparece para quem vai preencher.",
    ],
  },
  {
    numero: 4,
    titulo: "Preencher o checklist",
    quem: "Líder, aplicador ou administrador",
    onde: { href: "/governanca/nova", rotulo: "Preencher checklist" },
    itens: [
      <>
        Em <b>Preencher checklist</b>, busque e escolha o checklist.
      </>,
      "Se ele pede a UH, escolha a acomodação (os botões 10, 11 e 12 filtram pelo andar). O líder também informa a camareira que limpou.",
      "Responda seção por seção. O botão para avançar só libera quando os itens obrigatórios estão respondidos.",
      <>
        Em cada item dá para comentar e anexar foto. Nos itens com N/A, use quando não se aplica.
        Quando o &quot;Não&quot; abre plano de ação, preencha a prioridade, <b>o que precisa ser feito</b> e
        quem vai fazer.
      </>,
      <>
        Ao final, clique em <b>Finalizar checklist</b>. Quem preencheu, a data e a hora ficam
        registrados automaticamente.
      </>,
    ],
  },
  {
    numero: 5,
    titulo: "Consultar as inspeções",
    quem: "Todos (cada um vê o que tem permissão)",
    onde: { href: "/governanca", rotulo: "Início" },
    itens: [
      <>
        O <b>Início</b> mostra as inspeções recentes. Clique em uma para ver o resumo com todas as
        respostas, fotos e planos de ação.
      </>,
      <>
        O administrador vê a lista completa em <b>Inspeções</b>, com busca por checklist, UH,
        camareira ou quem aplicou.
      </>,
    ],
  },
  {
    numero: 6,
    titulo: "Acompanhar os relatórios",
    quem: "Administrador",
    onde: { href: "/governanca/admin/relatorios", rotulo: "Relatórios", soAdmin: true },
    itens: [
      "Escolha o período (7, 30, 90 dias ou tudo) e, se quiser, um checklist específico.",
      <>
        Os indicadores mostram total de inspeções, <b>conformidade</b> (percentual de &quot;Sim&quot; entre
        os itens Sim/Não, sem contar N/A), não conformidades e planos de ação.
      </>,
      "As tabelas mostram o resultado por checklist e por camareira, os itens mais reprovados e a lista de planos de ação com prioridade e responsável.",
    ],
  },
];

export default async function ComoFuncionaPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/como-funciona");
  const ehAdmin = papel === "admin";

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <Titulo
        titulo="Como funciona"
        subtitulo="O caminho completo do módulo de checklists: do cadastro ao preenchimento e aos relatórios."
      />

      <Fluxograma />

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Passo a passo
      </h2>
      <div className="space-y-4">
        {ETAPAS.map((e) => (
          <section key={e.numero} id={`etapa-${e.numero}`} className={`${cardCls} scroll-mt-4`}>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {e.numero}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-slate-800">{e.titulo}</h2>
                <p className="text-xs text-slate-500">Quem faz: {e.quem}</p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                  {e.itens.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                {e.onde && (!e.onde.soAdmin || ehAdmin) && (
                  <Link
                    href={e.onde.href}
                    className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
                  >
                    Ir para {e.onde.rotulo} →
                  </Link>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </GovernancaShell>
  );
}
