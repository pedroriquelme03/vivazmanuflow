"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MIGRATION_HINT_GOV, erroSchemaGov } from "@/lib/governanca";
import { Erro, Titulo, inputCls } from "../../ui";

type Pessoa = { id: string; nome: string; role: string; governanca_papel: string | null };

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  lider: "Líder",
  colaborador: "Colaborador",
};

export function EquipeApp({ pessoas }: { pessoas: Pessoa[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  async function definir(p: Pessoa, valor: string) {
    setSalvando(p.id);
    setErro(null);
    const { error } = await supabase.rpc("admin_definir_governanca", {
      p_user_id: p.id,
      p_papel: valor || null,
    });
    setSalvando(null);
    if (error) {
      return setErro(erroSchemaGov(error.message, error.code) ? MIGRATION_HINT_GOV : error.message);
    }
    router.refresh();
  }

  return (
    <>
      <Titulo
        titulo="Acessos"
        subtitulo="Escolha quem usa os checklists. Líder vê as inspeções de todos e escolhe a camareira nos checklists de UH; camareira (aplicador) vê só as próprias. Administradores sempre têm acesso."
      />
      <Erro texto={erro} />

      <div className="space-y-2">
        {pessoas.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
              {p.nome.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.nome}</p>
              <p className="text-xs text-slate-500">{ROLE_LABEL[p.role] ?? p.role} nos chamados</p>
            </div>
            {p.role === "admin" ? (
              <span className="text-sm font-medium text-slate-500">Administrador</span>
            ) : (
              <select
                className={`${inputCls} w-44`}
                value={p.governanca_papel ?? ""}
                disabled={salvando === p.id}
                onChange={(e) => definir(p, e.target.value)}
                aria-label={`Acesso de ${p.nome} à governança`}
              >
                <option value="">Sem acesso</option>
                <option value="camareira">Aplicador / camareira</option>
                <option value="lider">Líder</option>
              </select>
            )}
          </div>
        ))}
        {pessoas.length === 0 && <p className="text-sm text-slate-500">Nenhum usuário ativo.</p>}
      </div>
    </>
  );
}
