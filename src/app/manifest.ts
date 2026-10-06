import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chamados Vivaz — Vivaz Cataratas",
    short_name: "Chamados Vivaz",
    description: "Sistema de chamados do resort Vivaz Cataratas.",
    start_url: "/",
    display: "standalone",
    background_color: "#063b45",
    theme_color: "#0891b2",
    icons: [
      {
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
