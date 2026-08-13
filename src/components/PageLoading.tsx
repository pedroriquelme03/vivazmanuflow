import { BrandMark } from "@/components/BrandMark";

export function PageLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        compact ? "py-16" : "min-h-[60vh] flex-1"
      }`}
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      <div className="page-loading-mark">
        <BrandMark className="h-14 w-14 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-500">Carregando…</p>
    </div>
  );
}
