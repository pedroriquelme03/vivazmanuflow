import { ImageResponse } from "next/og";

/** Mesmo fundo do BrandMark na sidebar (`bg-brand-500`). */
export const APP_ICON_BG = "#06b6d4";

const MARK_W = 24.65;
const MARK_H = 40.69;

function MiniIconMark({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${MARK_W} ${MARK_H}`}
      fill="#ffffff"
    >
      <path d="M6.73,31.48l3.98,9.21C4.47,36.47,1.56,32.83.41,29.88c2,1.65,4.38,2.86,6.32,1.61" />
      <path d="M1.84,20.89l4.89,10.6c-1.94,1.25-4.32.04-6.32-1.61-1.45-3.13,1.43-8.99,1.43-8.99" />
      <path d="M13.23,40.69s5.46-11.69,7.21-16.93c1.75-5.24.9-5.58.35-7.26-.55-1.68-2.27-4.62-2.27-4.62l-5.28,28.81Z" />
      <polygon points="11.97 0 7.71 8.6 7.98 19.22 11.97 40.69 11.97 0" />
      <polygon points="12.68 0 12.68 40.69 16.66 19.22 16.94 8.6 12.68 0" />
      <path d="M17.92,31.48l-3.98,9.21c6.24-4.22,9.15-7.86,10.3-10.81-2,1.65-4.38,2.86-6.32,1.61" />
      <path d="M22.81,20.89l-4.89,10.6c1.94,1.25,4.32.04,6.32-1.61,1.45-3.13-1.43-8.99-1.43-8.99" />
      <path d="M3.86,16.5c-.55,1.68-1.4,2.01.35,7.26,1.75,5.24,7.21,16.93,7.21,16.93L6.13,11.88s-1.72,2.94-2.27,4.62" />
    </svg>
  );
}

/** Quadrado brand + marca branca a ~70%, como o BrandMark da sidebar. */
export function renderAppIcon(pixelSize: number) {
  const markH = Math.round(pixelSize * 0.7);
  const markW = Math.round(markH * (MARK_W / MARK_H));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: APP_ICON_BG,
        }}
      >
        <MiniIconMark width={markW} height={markH} />
      </div>
    ),
    { width: pixelSize, height: pixelSize },
  );
}
