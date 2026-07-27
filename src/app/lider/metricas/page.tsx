import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { PainelShell } from "@/components/AdminSidebar";
import { MetricasDashboard } from "./MetricasDashboard";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/lider/metricas");
  if (perfil.role === "colaborador") redirect("/colaborador");

  return (
    <PainelShell perfil={perfil}>
      <MetricasDashboard />
    </PainelShell>
  );
}
