"use client";

import { useState } from "react";
import {
  alvoDoFiltro,
  caminhoParaTexto,
  filhos,
  filtroDoLugar,
  mudarFiltroLugar,
  opcoesDoCaminho,
  textoParaCaminho,
  type CaminhoFiltro,
  type LugarRef,
  type NivelLugar,
} from "@/lib/checklist-lugares";
import { inputCls } from "./ui";

const ROTULOS: Record<NivelLugar, string> = { categoria: "Categoria", tipo: "Tipo de espaço", classificacao: "Classificação" };

/**
 * Escolhe um ponto da árvore de uma unidade, em cascata: Categoria → Tipo →
 * Classificação. Devolve o ponto mais específico escolhido. `minimo` = "tipo" exige
 * pelo menos o tipo (um local específico fica num tipo ou classificação).
 */
export function EscolhaLugar({
  lugares,
  propriedadeId,
  valor,
  onChange,
  vazio = "Escolha…",
}: {
  lugares: readonly LugarRef[];
  propriedadeId: string;
  valor: string;
  onChange: (lugarId: string) => void;
  vazio?: string;
}) {
  const filtro = filtroDoLugar(lugares, valor || null);
  const categorias = filhos(lugares, null, propriedadeId);
  const tipos = filtro.categoria ? filhos(lugares, filtro.categoria) : [];
  const classificacoes = filtro.tipo ? filhos(lugares, filtro.tipo) : [];
  const mudar = (nivel: NivelLugar, id: string) => onChange(alvoDoFiltro(mudarFiltroLugar(filtro, nivel, id)) ?? "");

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Nivel rotulo={ROTULOS.categoria} valor={filtro.categoria} opcoes={categorias} vazio={vazio} onChange={(id) => mudar("categoria", id)} />
      {filtro.categoria && (
        <Nivel rotulo={ROTULOS.tipo} valor={filtro.tipo} opcoes={tipos} vazio="Todos os tipos" onChange={(id) => mudar("tipo", id)} />
      )}
      {filtro.tipo && classificacoes.length > 0 && (
        <Nivel
          rotulo={ROTULOS.classificacao}
          valor={filtro.classificacao}
          opcoes={classificacoes}
          vazio="Sem classificação"
          onChange={(id) => mudar("classificacao", id)}
        />
      )}
    </div>
  );
}

function Nivel({
  rotulo,
  valor,
  opcoes,
  vazio,
  onChange,
}: {
  rotulo: string;
  valor: string;
  opcoes: readonly LugarRef[];
  vazio: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-slate-500">{rotulo}</span>
      <select className={inputCls} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">{vazio}</option>
        {opcoes.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nome}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Filtro "Onde" pelos nomes da árvore (Categoria → Tipo → Classificação). Sem
 * unidade escolhida, junta as duas: "Sanitários" pega os banheiros do hotel e do parque.
 */
export function FiltroCaminho({
  lugares,
  unidadeId,
  caminho,
  onChange,
}: {
  lugares: readonly LugarRef[];
  unidadeId: string | null;
  caminho: CaminhoFiltro;
  onChange: (caminho: CaminhoFiltro) => void;
}) {
  const niveis: NivelLugar[] = ["categoria", "tipo", "classificacao"];
  return (
    <>
      {niveis.map((nivel, i) => {
        if (i > caminho.length) return null;
        const opcoes = opcoesDoCaminho(lugares, unidadeId, caminho.slice(0, i));
        if (opcoes.length === 0 && !caminho[i]) return null;
        return (
          <label key={nivel} className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-slate-500">{ROTULOS[nivel]}</span>
            <select
              className={inputCls}
              value={caminho[i] ?? ""}
              onChange={(e) => onChange(e.target.value ? [...caminho.slice(0, i), e.target.value] : caminho.slice(0, i))}
            >
              <option value="">{i === 0 ? "Todas as categorias" : "Todos"}</option>
              {opcoes.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </>
  );
}

/** O mesmo filtro dentro de um formulário que vai pela URL (relatórios). */
export function FiltroCaminhoForm({
  lugares,
  unidades,
  unidadeInicial,
  ondeInicial,
}: {
  lugares: readonly LugarRef[];
  unidades: { id: string; nome: string }[];
  unidadeInicial: string;
  ondeInicial: string;
}) {
  const [unidade, setUnidade] = useState(unidadeInicial);
  const [caminho, setCaminho] = useState(textoParaCaminho(ondeInicial));
  return (
    <>
      <label className="block min-w-0">
        <span className="mb-1 block text-xs font-medium text-slate-500">Unidade</span>
        <select
          className={inputCls}
          name="unidade"
          value={unidade}
          onChange={(e) => {
            setUnidade(e.target.value);
            setCaminho([]);
          }}
        >
          <option value="">Todas as unidades</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </label>
      <FiltroCaminho lugares={lugares} unidadeId={unidade || null} caminho={caminho} onChange={setCaminho} />
      <input type="hidden" name="onde" value={caminhoParaTexto(caminho)} />
    </>
  );
}
