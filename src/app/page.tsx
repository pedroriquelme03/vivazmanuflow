import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { CartaoEntrada } from "@/components/CartaoEntrada";
import { MolduraEntrada } from "@/components/MolduraEntrada";

export default function Home() {
  return (
    <MolduraEntrada>
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <CartaoEntrada className="max-w-sm p-8 text-center sm:max-w-md sm:p-10 lg:max-w-lg lg:p-12">
          <BrandMark className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30" />
          <h1 className="text-2xl font-bold tracking-tight">Chamados Vivaz</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sistema de chamados do Vivaz Cataratas
          </p>

          <Link
            href="/login"
            className="relative z-10 mt-8 block rounded-xl bg-brand-600 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
          >
            Login
          </Link>
          <Link
            href="/solicitar-login"
            className="relative z-10 mt-3 block rounded-xl border border-slate-300 bg-white px-5 py-4 text-base font-semibold text-slate-800 shadow-sm transition hover:border-brand-400 hover:bg-white"
          >
            Solicitar login
          </Link>
        </CartaoEntrada>
      </main>
    </MolduraEntrada>
  );
}
