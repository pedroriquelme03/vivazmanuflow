type BrandMarkProps = {
  className?: string;
  imgClassName?: string;
};

export function BrandMark({
  className = "h-14 w-14 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30",
  imgClassName = "h-[70%] w-[70%]",
}: BrandMarkProps) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mini-icon.svg"
        alt="Vivaz Cataratas"
        className={`object-contain ${imgClassName}`}
      />
    </div>
  );
}
