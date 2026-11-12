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
  onde?: { href: string; rotulo: string; soAdmin?: boolean; soEquipe?: boolean };
  itens: React.ReactNode[];
};

const ETAPAS: Etapa[] = [
  {
    numero: 1,
    titulo: "Liberar o acesso",
    quem: "Administrador",
    onde: { href: "/admin", rotulo: "Cadastros > Equipe", soAdmin: true },
    itens: [
      <>
        Todo mundo começa sem o Checklist. Em <b>Cadastros &gt; Equipe</b>, marque o ambiente{" "}
        <b>Checklist</b> em quem vai usar. Desmarcado, a pessoa não vê os checklists, inclusive o
        administrador. Solicitante não tem essa opção.
      </>,
      <>
        Com Checklist marcado, escolha o <b>Perfil no checklist</b>: <b>Líder</b> vê as inspeções de
        todos, o Kanban e escolhe o colaborador avaliado; <b>Aplicador</b> vê só as inspeções que
        fez. O administrador marcado é o administrador do checklist.
      </>,
      "Quem tem mais de um ambiente troca entre Manutenção, TI e Checklist no seletor do menu.",
    ],
  },
  {
    numero: 2,
    titulo: "Cadastrar setores, locais e colaboradores",
    quem: "Administrador (colaboradores: também o líder)",
    onde: { href: "/governanca/admin/setores", rotulo: "Setores", soAdmin: true },
    itens: [
      <>
        Em <b>Setores</b>, cada propriedade (Vivaz, Aquamania) ganha seus setores. Ali também se marca
        quem acessa cada setor: o líder e o aplicador só veem os setores marcados para eles.
      </>,
      <>
        Em <b>Locais</b>, cadastre onde o checklist é aplicado: UH (apartamento ou suíte) ou área, como
        casa de máquinas ou bilheteria.
      </>,
      <>
        Em <b>Colaboradores</b>, cadastre quem é avaliado (nome e setor, sem login). O líder cadastra
        só nos próprios setores. Os nomes aparecem como sugestão em &quot;Quem vai fazer?&quot; no
        plano de ação.
      </>,
      "Use Ativo/Inativo em vez de remover quem já tem inspeções, para não perder o histórico.",
    ],
  },
  {
    numero: 3,
    titulo: "Criar o checklist",
    quem: "Administrador e líder (nos próprios setores)",
    onde: { href: "/governanca/admin/processos", rotulo: "Gerenciar checklists", soEquipe: true },
    itens: [
      <>
        Em <b>Gerenciar checklists</b>, clique em <b>+ Criar checklist</b> e informe nome e
        setor. O líder cria e edita só os checklists dos setores dele.
      </>,
      <>
        Marque <b>Pede o local</b> quando o checklist é feito em um lugar certo e escolha se é
        em UH (apartamentos, suítes ou ambos) ou em uma <b>área</b>, como casa de máquinas.
      </>,
      <>
        Monte as <b>seções</b> (cada seção vira uma tela no preenchimento) e adicione as{" "}
        <b>perguntas</b>. Use as setas para mudar a ordem das seções.
      </>,
      <>
        Clique no tipo ao lado de cada pergunta para configurá-la: tipo de resposta (Sim/Não,
        carinhas, texto, número, data, hora, lista de uma ou de várias opções), subárea, dica,
        obrigatória, permite N/A, se o &quot;Não&quot; abre plano de ação e o <b>peso</b> na nota.
      </>,
      <>
        Também na pergunta: o que fica <b>obrigatório em cada resposta</b> (por exemplo, &quot;Não&quot;
        exige foto e comentário) e as <b>condicionais</b>: uma resposta mostra outra pergunta ou uma
        seção inteira, que fica escondida até lá e não conta na nota.
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
        Em <b>Preencher checklist</b>, escolha a <b>propriedade</b>, o <b>setor</b> e o checklist (ou
        busque pelo nome). Cada um vê só os setores liberados para ele.
      </>,
      "Se ele pede o local, escolha a UH (os botões 10, 11 e 12 filtram pelo andar) ou a área.",
      "Confirme a data do checklist (já vem com hoje). O líder também informa o colaborador avaliado, entre os do setor do checklist.",
      "Responda seção por seção. O botão para avançar só libera quando os itens obrigatórios estão respondidos.",
      <>
        Em cada item dá para comentar e anexar foto. Nos itens com N/A, use quando não se aplica.
        Quando o &quot;Não&quot; abre plano de ação, preencha a prioridade, <b>o que precisa ser feito</b> e
        quem vai fazer.
      </>,
      <>
        As respostas ficam salvas a cada seção. Se sair no meio, o checklist fica{" "}
        <b>Em andamento</b> no Início e dá para continuar de onde parou. Também dá para{" "}
        <b>Pausar</b> e retomar depois.
      </>,
      <>
        O líder do setor (e o administrador) pode continuar, pausar, <b>cancelar</b> (fica no
        histórico) ou <b>excluir</b> o checklist em andamento de outra pessoa.
      </>,
      <>
        Ao final, clique em <b>Finalizar checklist</b>. Quem preencheu, o início, o fim e a duração
        ficam registrados automaticamente.
      </>,
    ],
  },
  {
    numero: 6,
    titulo: "Acompanhar no Kanban",
    quem: "Líder e administrador",
    onde: { href: "/governanca/admin/kanban", rotulo: "Kanban", soEquipe: true },
    itens: [
      <>
        O <b>Kanban</b> mostra quem está preenchendo agora (<b>Em andamento</b>), o que terminou sem
        problema, o que ficou <b>Com pendência</b> (item reprovado ou plano de ação aberto) e o que
        já teve a <b>Pendência resolvida</b>.
      </>,
      "Abra o cartão para ver as respostas e marcar cada plano de ação como resolvido.",
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
        Líder e administrador veem a lista em <b>Inspeções</b>, com filtros por status, setor,
        checklist, colaborador, quem aplicou e período, e a duração de cada checklist.
      </>,
    ],
  },
  {
    numero: 7,
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
                {e.onde &&
                  (!e.onde.soAdmin || ehAdmin) &&
                  (!e.onde.soEquipe || papel !== "camareira") && (
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
