import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <BrandMark className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30" />
        <h1 className="text-2xl font-bold tracking-tight">Manutenção Vivaz</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sistema de Gestão de demandas do setor Manutenção do Vivaz Cataratas
        </p>

        <div className="mt-8 grid gap-3">
          <Link
            href="/abrir"
            className="rounded-xl bg-brand-600 px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Abrir uma demanda
          </Link>
          <Link
            href="/acompanhar"
            className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Acompanhar meus pedidos
          </Link>
          <Link
            href="/login"
            className="mt-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-brand-700 hover:underline"
          >
            Sou da equipe — entrar
          </Link>
        </div>
      </div>
    </main>
  );
}
