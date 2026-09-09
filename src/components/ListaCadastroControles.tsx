"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

export type PageSize = 10 | 50 | 100 | "todos";
export type StatusFiltro = "todos" | "ativos" | "inativos";

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

const inputCls =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function useListaCadastro<T>(
  itens: T[],
  getSearchText: (item: T) => string,
  options?: {
    getAtivo?: (item: T) => boolean;
    filtro?: (item: T) => boolean;
  },
) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [pagina, setPagina] = useState(1);

  const getAtivo = options?.getAtivo;
  const filtro = options?.filtro;

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((item) => {
      if (filtro && !filtro(item)) return false;
      if (getAtivo) {
        const ativo = getAtivo(item);
        if (status === "ativos" && !ativo) return false;
        if (status === "inativos" && ativo) return false;
      }
      if (!q) return true;
      return getSearchText(item).toLowerCase().includes(q);
    });
  }, [itens, busca, status, getSearchText, getAtivo, filtro]);

  useEffect(() => {
    setPagina(1);
  }, [busca, status, pageSize]);

  const total = filtrados.length;
  const tamanho = pageSize === "todos" ? Math.max(total, 1) : pageSize;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho) || 1);

  useEffect(() => {
    setPagina((p) => Math.min(p, totalPaginas));
  }, [totalPaginas]);

  const paginaAtual = Math.min(pagina, totalPaginas);

  const paginaItens = useMemo(() => {
    if (pageSize === "todos") return filtrados;
    const ini = (paginaAtual - 1) * tamanho;
    return filtrados.slice(ini, ini + tamanho);
  }, [filtrados, pageSize, paginaAtual, tamanho]);

  return {
    busca,
    setBusca,
    status,
    setStatus,
    pageSize,
    setPageSize,
    pagina: paginaAtual,
    setPagina,
    total,
    totalPaginas,
    itens: paginaItens,
  };
}

export function ListaCadastroControles({
  busca,
  setBusca,
  status,
  setStatus,
  pageSize,
  setPageSize,
  pagina,
  setPagina,
  total,
  totalPaginas,
  placeholder = "Pesquisar…",
  filtrosExtras,
  mostrarStatus = true,
}: {
  busca: string;
  setBusca: (v: string) => void;
  status: StatusFiltro;
  setStatus: (v: StatusFiltro) => void;
  pageSize: PageSize;
  setPageSize: (v: PageSize) => void;
  pagina: number;
  setPagina: (v: number | ((p: number) => number)) => void;
  total: number;
  totalPaginas: number;
  placeholder?: string;
  filtrosExtras?: ReactNode;
  mostrarStatus?: boolean;
}) {
  const inicio =
    total === 0
      ? 0
      : pageSize === "todos"
        ? 1
        : (pagina - 1) * pageSize + 1;
  const fim =
    total === 0
      ? 0
      : pageSize === "todos"
        ? total
        : Math.min(pagina * pageSize, total);

  return (
    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputCls} min-w-[180px] flex-1`}
          placeholder={placeholder}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {mostrarStatus && (
          <select
            className={selectCls}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFiltro)}
          >
            <option value="todos">Todos os status</option>
            <option value="ativos">Somente ativos</option>
            <option value="inativos">Somente inativos</option>
          </select>
        )}
        {filtrosExtras}
        <select
          className={selectCls}
          value={String(pageSize)}
          onChange={(e) => {
            const v = e.target.value;
            setPageSize(v === "todos" ? "todos" : (Number(v) as 10 | 50 | 100));
          }}
        >
          <option value="10">10 por página</option>
          <option value="50">50 por página</option>
          <option value="100">100 por página</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {total === 0
            ? "Nenhum registro encontrado"
            : `Mostrando ${inicio}–${fim} de ${total}`}
        </span>
        {pageSize !== "todos" && totalPaginas > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-200 px-2 py-1 font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 font-medium text-slate-600">
              {pagina} / {totalPaginas}
            </span>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="rounded-md border border-slate-200 px-2 py-1 font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
