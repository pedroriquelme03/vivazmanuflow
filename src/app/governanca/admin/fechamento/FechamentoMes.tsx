"use client";

import { useRouter } from "next/navigation";
import { corNota, type FechamentoCamareira } from "@/lib/governanca";
import { Vazio, btnPrimario, cardCls, inputCls, labelCls } from "../../ui";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function nomeMes(mes: string) {
  const [ano, m] = mes.split("-");
  return `${MESES[Number(m) - 1]} de ${ano}`;
}

const numeroBr = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Planilha CSV (separada por ponto e vírgula, que o Excel em português abre direto). */
function baixarCsv(mes: string, linhas: FechamentoCamareira[]) {
  const cabecalho = ["Camareira", "Vistorias", "Itens Sim", "Itens Não", "Média das vistorias (0-100)", "Nota de produtividade (100-300)"];
  const corpo = linhas.map((l) => [l.nome, l.vistorias, l.sim, l.nao, numeroBr(l.media), l.produtividade]);
  const csv = [cabecalho, ...corpo]
    .map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `produtividade-camareiras-${mes}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FechamentoMes({ mes, linhas }: { mes: string; linhas: FechamentoCamareira[] }) {
  const router = useRouter();

  return (
    <>
      <div className={`${cardCls} mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`}>
        <label className="block">
          <span className={labelCls}>Mês</span>
          <input
            type="month"
            className={inputCls}
            value={mes}
            onChange={(e) => e.target.value && router.push(`/governanca/admin/fechamento?mes=${e.target.value}`)}
          />
        </label>
        <button
          type="button"
          className={btnPrimario}
          disabled={linhas.length === 0}
          onClick={() => baixarCsv(mes, linhas)}
        >
          Baixar planilha para o RH
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Cada vistoria vale de 0 a 100: começa em 100 e cada item marcado como Não tira o mesmo tanto. A nota do mês
        é a média das vistorias, convertida para a escala de produtividade: média 0 = 100 e média 100 = 300.
      </p>

      {linhas.length === 0 ? (
        <Vazio texto={`Nenhuma vistoria finalizada com camareira em ${nomeMes(mes)}.`} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Camareira</th>
                <th className="px-4 py-3 font-medium">Vistorias</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Itens Não</th>
                <th className="px-4 py-3 font-medium">Média</th>
                <th className="px-4 py-3 font-medium">Produtividade</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.nome} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{l.nome}</td>
                  <td className="px-4 py-3">{l.vistorias}</td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{l.nao}</td>
                  <td className={`px-4 py-3 font-semibold ${corNota(l.media)}`}>{numeroBr(l.media)}</td>
                  <td className="px-4 py-3 text-base font-bold text-slate-800">{l.produtividade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
