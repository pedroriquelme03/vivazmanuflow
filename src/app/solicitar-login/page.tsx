import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { CartaoEntrada } from "@/components/CartaoEntrada";
import { MolduraEntrada } from "@/components/MolduraEntrada";
import { FormSolicitar } from "./FormSolicitar";

export default function SolicitarLoginPage() {
  return (
    <MolduraEntrada>
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
        <CartaoEntrada className="max-w-sm p-8 sm:max-w-md sm:p-10 lg:max-w-lg lg:p-12">
          <div className="mb-6 text-center">
            <BrandMark className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30" />
            <h1 className="text-xl font-bold">Solicitar login</h1>
            <p className="mt-1 text-sm text-slate-500">
              A equipe de TI recebe seus dados e cria o acesso.
            </p>
          </div>

          <FormSolicitar />

          <Link
            href="/"
            className="mt-6 block text-center text-sm text-slate-400 transition hover:text-brand-700"
          >
            ← Voltar
          </Link>
        </CartaoEntrada>
      </main>
    </MolduraEntrada>
  );
}
