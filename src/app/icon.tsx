import { renderAppIcon } from "@/lib/app-icon";

export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    { contentType: "image/png", size: { width: 192, height: 192 }, id: "192" },
    { contentType: "image/png", size: { width: 512, height: 512 }, id: "512" },
  ];
}

export default async function Icon({ id }: { id: string | Promise<string> }) {
  const size = Number(await id);
  return renderAppIcon(size);
}
