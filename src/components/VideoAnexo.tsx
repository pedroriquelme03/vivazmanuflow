export function VideoAnexo({ url }: { url: string }) {
  return (
    <div className="w-full max-w-[220px] overflow-hidden rounded-lg bg-black">
      <video
        src={url}
        controls
        playsInline
        className="h-36 w-full object-contain"
      />
    </div>
  );
}
