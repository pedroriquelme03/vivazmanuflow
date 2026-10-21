export function DocumentoAnexo({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 hover:border-brand-300 hover:bg-white"
    >
      <span className="text-xl">📄</span>
      Abrir PDF
    </a>
  );
}
