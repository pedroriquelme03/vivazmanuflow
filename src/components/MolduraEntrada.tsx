type PlantaProps = {
  src: string;
  className: string;
};

// A arte já vem recortada para encostar na lateral, então cada peça fica presa
// na borda e o excesso sai da tela. Sem espelhar: o recorte tem lado certo.
function Planta({ src, className }: PlantaProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className={`pointer-events-none absolute select-none object-contain ${className}`}
    />
  );
}

export function MolduraEntrada({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-gradient-to-b from-[#f6f9fc] via-[#eaf2f8] to-[#dbe8f2]">
      <div className="pointer-events-none absolute inset-0 z-0 touch-none" aria-hidden>
        <Planta
          src="/plantas/esq-topo.webp"
          className="top-0 left-0 w-24 sm:w-36 lg:w-48 xl:w-56"
        />
        {/* A peça do meio só cabe sem poluir quando há sobra nas laterais. */}
        <Planta
          src="/plantas/esq-meio.webp"
          className="top-1/2 left-0 hidden w-40 -translate-y-1/2 lg:block xl:w-48"
        />
        <Planta
          src="/plantas/esq-base.webp"
          className="bottom-0 left-0 w-32 sm:w-44 lg:w-60 xl:w-72"
        />

        <Planta
          src="/plantas/dir-topo.webp"
          className="top-0 right-0 w-28 sm:w-40 lg:w-52 xl:w-60"
        />
        <Planta
          src="/plantas/dir-meio.webp"
          className="top-1/2 right-0 hidden w-36 -translate-y-1/2 lg:block xl:w-44"
        />
        <Planta
          src="/plantas/dir-base.webp"
          className="right-0 bottom-0 w-28 sm:w-40 lg:w-56 xl:w-64"
        />
      </div>

      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        {children}
        <footer className="pointer-events-none mt-auto px-4 py-6 text-center text-xs text-slate-500">
          © 2026 Vivaz Cataratas Resort • Dev by{" "}
          <a
            href="https://pedroriquelme.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto font-medium text-brand-700 hover:underline"
          >
            Pedro Riquelme
          </a>
        </footer>
      </div>
    </div>
  );
}
