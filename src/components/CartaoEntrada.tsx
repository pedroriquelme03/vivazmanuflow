export function CartaoEntrada({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate w-full overflow-hidden rounded-3xl border border-white/70 shadow-xl shadow-slate-900/10 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-white/80 backdrop-blur-md"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
