"use client";

import { useState } from "react";
import { disponibilidade, formatarPercentual, mtbfHoras } from "@/lib/novidades/calculos";
import { cardCls, inputCls, labelCls } from "../../governanca/ui";

/** Disponibilidade e MTBF com horas informadas à mão (o sistema não mede horas de operação). */
export function CalculadoraDisponibilidade() {
  const [requerido, setRequerido] = useState(200);
  const [parado, setParado] = useState(8);
  const [operacao, setOperacao] = useState(720);
  const [falhas, setFalhas] = useState(3);
  const mtbf = mtbfHoras(operacao, falhas);

  return (
    <section className={cardCls}>
      <h2 className="font-bold text-slate-800">Calculadora: disponibilidade e MTBF de um equipamento</h2>
      <p className="text-xs text-slate-500">
        Use as horas reais da janela que importa (horário de ocupação, operação contratada).
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Horas requeridas</label>
          <input type="number" className={inputCls} value={requerido} onChange={(e) => setRequerido(Number(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Horas indisponível</label>
          <input type="number" className={inputCls} value={parado} onChange={(e) => setParado(Number(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Horas de operação</label>
          <input type="number" className={inputCls} value={operacao} onChange={(e) => setOperacao(Number(e.target.value))} />
        </div>
        <div>
          <label className={labelCls}>Falhas no intervalo</label>
          <input type="number" className={inputCls} value={falhas} onChange={(e) => setFalhas(Number(e.target.value))} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Disponibilidade observada</p>
          <p className="text-2xl font-bold text-brand-700">{formatarPercentual(disponibilidade(requerido, parado))}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">MTBF</p>
          <p className="text-2xl font-bold text-brand-700">
            {mtbf === null ? `Sem falhas em ${operacao} h` : `${mtbf.toLocaleString("pt-BR")} h`}
          </p>
        </div>
      </div>
    </section>
  );
}
