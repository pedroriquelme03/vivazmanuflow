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
import { inputCls, labelCls } from "./ui";

const ROTULOS: Record<NivelLugar, string> = { categoria: "Categoria", tipo: "Tipo de espaço", classificacao: "Classificação" };

/**
 * Escolhe um ponto da árvore de uma unidade, em cascata: Categoria → Tipo →
 * Classificação. Os três campos ficam sempre à vista (o layout não pula); os que
 * ainda não dá para escolher ficam apagados. Devolve o ponto mais específico.
 *   modo "local": o local fica num tipo (classificação opcional);
 *   modo "aplicacao": pode parar em qualquer nível (vale para tudo abaixo).
 * `embutido` devolve só os campos, para entrarem na grade de quem chama.
 */
export function EscolhaLugar({
  lugares,
  propriedadeId,
  valor,
  onChange,
  modo = "local",
  embutido = false,
}: {
  lugares: readonly LugarRef[];
  propriedadeId: string;
  valor: string;
  onChange: (lugarId: string) => void;
  modo?: "local" | "aplicacao";
  embutido?: boolean;
}) {
  const filtro = filtroDoLugar(lugares, valor || null);
  const categorias = filhos(lugares, null, propriedadeId);
  const tipos = filtro.categoria ? filhos(lugares, filtro.categoria) : [];
  const classificacoes = filtro.tipo ? filhos(lugares, filtro.tipo) : [];
  const mudar = (nivel: NivelLugar, id: string) => onChange(alvoDoFiltro(mudarFiltroLugar(filtro, nivel, id)) ?? "");
  const deLocal = modo === "local";

  const campos = (
    <>
      <Nivel
        rotulo={ROTULOS.categoria}
        valor={filtro.categoria}
        opcoes={categorias}
        vazio={categorias.length ? "Escolha a categoria…" : "Nenhuma categoria"}
        onChange={(id) => mudar("categoria", id)}
      />
      <Nivel
        rotulo={ROTULOS.tipo}
        valor={filtro.tipo}
        opcoes={tipos}
        desligado={!filtro.categoria}
        vazio={!filtro.categoria ? "Escolha a categoria antes" : deLocal ? "Escolha o tipo…" : "Toda a categoria"}
        onChange={(id) => mudar("tipo", id)}
      />
      <Nivel
        rotulo={ROTULOS.classificacao}
        valor={filtro.classificacao}
        opcoes={classificacoes}
        desligado={!filtro.tipo || classificacoes.length === 0}
        vazio={
          !filtro.tipo
            ? "Escolha o tipo antes"
            : classificacoes.length === 0
              ? "Este tipo não tem"
              : deLocal
                ? "Sem classificação"
                : "Todo o tipo"
        }
        onChange={(id) => mudar("classificacao", id)}
      />
    </>
  );
  return embutido ? campos : <div className="grid gap-3 sm:grid-cols-3">{campos}</div>;
}

function Nivel({
  rotulo,
  valor,
  opcoes,
  vazio,
  desligado = false,
  onChange,
}: {
  rotulo: string;
  valor: string;
  opcoes: readonly LugarRef[];
  vazio: string;
  desligado?: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className={labelCls}>{rotulo}</span>
      <select
        className={`${inputCls} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
        value={valor}
        disabled={desligado}
        onChange={(e) => onChange(e.target.value)}
      >
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
