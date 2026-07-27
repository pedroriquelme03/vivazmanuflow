"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABEL, STATUS_BADGE, formatarData } from "@/lib/demanda-ui";
import { PrioridadeTag } from "@/components/PrioridadeTag";
import type { Enums } from "@/lib/database.types";

type Opcao = { id: string; nome: string };
type OpcaoProp = { id: string; nome: string; propriedade_id: string };

type Pedido = {
  id: string;
  titulo: string;
  prioridade: Enums<"demanda_prioridade">;
  status: Enums<"demanda_status">;
  criado_em: string;
  concluido_em: string | null;
  token: string;
  local: string | null;
};

export function BuscaHistorico({
  propriedades,
  solicitantes,
}: {
  propriedades: Opcao[];
  solicitantes: OpcaoProp[];
}) {
  const supabase = createClient();
  const [propriedadeId, setPropriedadeId] = useState(propriedades[0]?.id ?? "");
  const [solicitanteId, setSolicitanteId] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  const solicitantesFiltrados = useMemo(
    () => solicitantes.filter((s) => s.propriedade_id === propriedadeId),
    [solicitantes, propriedadeId],
  );

  async function buscar(id: string) {
    setSolicitanteId(id);
    setPedidos(null);
    if (!id) return;
    setCarregando(true);
    const { data } = await supabase.rpc("historico_solicitante", {
      p_solicitante_id: id,
    });
    setPedidos((data as Pedido[]) ?? []);
    setCarregando(false);
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

  return (
    <div className="grid gap-4">
      <select
        value={propriedadeId}
        onChange={(e) => {
          setPropriedadeId(e.target.value);
          setSolicitanteId("");
          setPedidos(null);
        }}
        className={inputCls}
      >
        {propriedades.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>

      <select
        value={solicitanteId}
        onChange={(e) => buscar(e.target.value)}
        className={inputCls}
      >
        <option value="">Selecione seu nome…</option>
        {solicitantesFiltrados.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome}
          </option>
        ))}
      </select>

      {carregando && (
        <p className="text-center text-sm text-slate-400">Carregando…</p>
      )}

      {pedidos && pedidos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
          Nenhuma demanda encontrada para este nome.
        </div>
      )}

      {pedidos && pedidos.length > 0 && (
        <ul className="grid gap-2">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/acompanhar/${p.token}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-800">{p.titulo}</p>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <PrioridadeTag prioridade={p.prioridade} />
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[p.status]}`}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {p.local ? `${p.local} · ` : ""}Aberta em{" "}
                  {formatarData(p.criado_em)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
