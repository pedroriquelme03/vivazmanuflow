// ---- Fluxograma ----
// No celular o fluxo desce (setas para baixo); a partir de sm ele corre na horizontal.

function Faixa({
  titulo,
  cor,
  children,
}: {
  titulo: string;
  cor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${cor}`}>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
        {children}
      </div>
    </div>
  );
}

function Caixa({ etapa, children }: { etapa?: number; children: React.ReactNode }) {
  const conteudo = (
    <span className="flex items-center gap-2">
      {etapa && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
          {etapa}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
  const cls =
    "block w-full max-w-60 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 shadow-sm sm:w-auto";
  return etapa ? (
    <a href={`#etapa-${etapa}`} className={`${cls} transition hover:border-brand-400 hover:text-brand-700`}>
      {conteudo}
    </a>
  ) : (
    <span className={cls}>{conteudo}</span>
  );
}

function Decisao({ children, nao }: { children: React.ReactNode; nao: string }) {
  return (
    <span className="flex flex-col items-center">
      <span
        className="flex h-24 w-36 items-center justify-center bg-amber-100 px-7 text-center text-xs font-semibold leading-tight text-amber-900"
        style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }}
      >
        {children}
      </span>
      <span className="mt-1 max-w-36 text-center text-[11px] text-slate-500">
        <b className="text-slate-600">Não:</b> {nao}
      </span>
    </span>
  );
}

function Seta({ rotulo }: { rotulo?: string }) {
  return (
    <span className="flex flex-col items-center text-slate-400 sm:flex-row" aria-hidden>
      {rotulo && <span className="text-[11px] font-semibold text-slate-500 sm:mr-1">{rotulo}</span>}
      <span className="text-lg leading-none sm:hidden">↓</span>
      <span className="hidden text-lg leading-none sm:inline">→</span>
    </span>
  );
}

function SetaEntreFaixas() {
  return (
    <div className="flex justify-center py-1 text-lg text-slate-400" aria-hidden>
      ↓
    </div>
  );
}

export function Fluxograma() {
  return (
    <figure aria-label="Fluxograma do módulo de checklists">
      <Faixa titulo="1 · Cadastro (administrador)" cor="border-violet-200 bg-violet-50/60">
        <Caixa etapa={1}>Liberar acessos</Caixa>
        <Seta />
        <Caixa etapa={2}>Cadastrar UHs e camareiras</Caixa>
        <Seta />
        <Caixa etapa={3}>Criar checklist: seções e perguntas</Caixa>
      </Faixa>

      <SetaEntreFaixas />

      <Faixa titulo="2 · Preenchimento (líder, aplicador ou admin)" cor="border-cyan-200 bg-cyan-50/60">
        <Caixa etapa={4}>Escolher o checklist</Caixa>
        <Seta />
        <Decisao nao="vai direto para as perguntas">Pede a UH?</Decisao>
        <Seta rotulo="Sim" />
        <Caixa>Escolher a UH (líder escolhe a camareira)</Caixa>
        <Seta />
        <Caixa>Responder as seções</Caixa>
        <Seta />
        <Decisao nao="segue para a próxima pergunta">Item com &quot;Não&quot; e plano de ação?</Decisao>
        <Seta rotulo="Sim" />
        <Caixa>Preencher o plano de ação</Caixa>
        <Seta />
        <Caixa>Finalizar checklist</Caixa>
      </Faixa>

      <SetaEntreFaixas />

      <Faixa titulo="3 · Acompanhamento" cor="border-emerald-200 bg-emerald-50/60">
        <Caixa etapa={5}>Ver as inspeções e o resumo</Caixa>
        <Seta />
        <Caixa etapa={6}>Analisar os relatórios</Caixa>
      </Faixa>

      <figcaption className="mt-2 text-center text-xs text-slate-500">
        Clique em uma etapa numerada para ver os detalhes.
      </figcaption>
    </figure>
  );
}

