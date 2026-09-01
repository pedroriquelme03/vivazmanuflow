import { QuadroTv } from "./QuadroTv";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quadro — Manutenção Vivaz",
  robots: { index: false, follow: false },
};

export default function QuadroPage() {
  return <QuadroTv />;
}
