-- Checklist: locais organizados em árvore (documento "Classificação de Áreas para o Checklist").
--
--   ONDE fica:  Unidade → Categoria → Tipo de espaço → Classificação → Local específico
--   QUEM cuida: etiquetas de setor no local (fora da árvore; um local pode ter várias).
--
--   * Unidade = propriedade (Vivaz Cataratas, Aquamania), que já existe.
--   * gov_lugares: categorias, tipos e classificações de cada unidade. "Área" deixa de
--     ser tipo: vira o nível Categoria (Operacional, Lazer...).
--   * Local específico continua em gov_acomodacoes (mesmos ids: histórico e itens
--     ficam ligados) e ganha lugar_id (o tipo ou a classificação onde ele fica).
--   * A categoria diz o que a ficha do local mostra: dados da UH (só Hospedagem) e quais
--     grupos de itens (eletrônicos, mobília, equipamentos).
--   * Checklist liga a um ou mais pontos da árvore (gov_processo_lugares) e vale para
--     tudo que está abaixo; sem ligação, continua como antes.
--   * Etiquetas de setor por local (gov_local_setores), usando os setores do checklist.
--   * Exemplos já criados a partir do documento e dos checklists: categorias e tipos das
--     duas unidades, casas de máquinas, piscinas, ETE, gerador, bilheteria...
-- Pode rodar de novo (não duplica).

-- Estrutura ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gov_lugares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propriedade_id uuid NOT NULL REFERENCES public.propriedades(id) ON DELETE RESTRICT,
  parent_id uuid REFERENCES public.gov_lugares(id) ON DELETE RESTRICT,
  nivel text NOT NULL CHECK (nivel IN ('categoria', 'tipo', 'classificacao')),
  nome text NOT NULL CHECK (btrim(nome) <> ''),
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  -- Só na categoria: o que a ficha do local mostra.
  ficha_uh boolean NOT NULL DEFAULT false,
  grupos text[] NOT NULL DEFAULT '{}',
  -- Só no tipo de Hospedagem: as UHs dele são suíte ou apartamento.
  tipo_uh text CHECK (tipo_uh IN ('suite', 'apartamento')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gov_lugares_nome_unico
  ON public.gov_lugares (propriedade_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(nome)));
CREATE INDEX IF NOT EXISTS gov_lugares_pai_idx ON public.gov_lugares (parent_id);

-- Categoria na raiz; tipo debaixo de categoria; classificação debaixo de tipo; mesma unidade.
CREATE OR REPLACE FUNCTION private.gov_lugar_valido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pai record;
BEGIN
  IF NEW.nivel = 'categoria' THEN
    IF NEW.parent_id IS NOT NULL THEN RAISE EXCEPTION 'Categoria fica direto na unidade'; END IF;
    RETURN NEW;
  END IF;
  SELECT nivel, propriedade_id INTO v_pai FROM public.gov_lugares WHERE id = NEW.parent_id;
  IF v_pai IS NULL THEN RAISE EXCEPTION 'Escolha onde fica'; END IF;
  IF v_pai.propriedade_id <> NEW.propriedade_id THEN RAISE EXCEPTION 'O pai é de outra unidade'; END IF;
  IF NEW.nivel = 'tipo' AND v_pai.nivel <> 'categoria' THEN RAISE EXCEPTION 'Tipo fica dentro de uma categoria'; END IF;
  IF NEW.nivel = 'classificacao' AND v_pai.nivel <> 'tipo' THEN RAISE EXCEPTION 'Classificação fica dentro de um tipo'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gov_lugares_valido ON public.gov_lugares;
CREATE TRIGGER gov_lugares_valido
  BEFORE INSERT OR UPDATE OF parent_id, nivel, propriedade_id ON public.gov_lugares
  FOR EACH ROW EXECUTE FUNCTION private.gov_lugar_valido();

-- Local específico: fica num tipo ou numa classificação.
ALTER TABLE public.gov_acomodacoes
  ADD COLUMN IF NOT EXISTS lugar_id uuid REFERENCES public.gov_lugares(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS gov_acomodacoes_lugar_idx ON public.gov_acomodacoes (lugar_id);

CREATE OR REPLACE FUNCTION private.gov_local_no_lugar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_lugar record;
BEGIN
  IF NEW.lugar_id IS NULL THEN RETURN NEW; END IF;
  SELECT nivel, propriedade_id INTO v_lugar FROM public.gov_lugares WHERE id = NEW.lugar_id;
  IF v_lugar.nivel NOT IN ('tipo', 'classificacao') THEN
    RAISE EXCEPTION 'O local fica num tipo ou numa classificação';
  END IF;
  IF v_lugar.propriedade_id <> NEW.propriedade_id THEN
    RAISE EXCEPTION 'O lugar é de outra unidade';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gov_acomodacoes_no_lugar ON public.gov_acomodacoes;
CREATE TRIGGER gov_acomodacoes_no_lugar
  BEFORE INSERT OR UPDATE OF lugar_id, propriedade_id ON public.gov_acomodacoes
  FOR EACH ROW EXECUTE FUNCTION private.gov_local_no_lugar();

-- Onde o checklist se aplica (vale para o ponto e tudo abaixo dele).
CREATE TABLE IF NOT EXISTS public.gov_processo_lugares (
  processo_id uuid NOT NULL REFERENCES public.gov_processos(id) ON DELETE CASCADE,
  lugar_id uuid NOT NULL REFERENCES public.gov_lugares(id) ON DELETE RESTRICT,
  PRIMARY KEY (processo_id, lugar_id)
);

-- Quem cuida de cada local (etiquetas de setor).
CREATE TABLE IF NOT EXISTS public.gov_local_setores (
  local_id uuid NOT NULL REFERENCES public.gov_acomodacoes(id) ON DELETE CASCADE,
  setor_id uuid NOT NULL REFERENCES public.gov_setores(id) ON DELETE CASCADE,
  PRIMARY KEY (local_id, setor_id)
);

-- Equipamentos como terceiro grupo de itens (bomba, filtro, gerador...).
ALTER TABLE public.gov_tipos_item DROP CONSTRAINT IF EXISTS gov_tipos_item_grupo_check;
ALTER TABLE public.gov_tipos_item
  ADD CONSTRAINT gov_tipos_item_grupo_check CHECK (grupo IN ('eletronico', 'mobilia', 'equipamento'));

INSERT INTO public.gov_tipos_item (nome, grupo)
VALUES ('Bomba', 'equipamento'), ('Filtro', 'equipamento'), ('Quadro elétrico', 'equipamento'),
       ('Dosador de cloro', 'equipamento'), ('Gerador', 'equipamento')
ON CONFLICT DO NOTHING;

-- RLS: quem usa o checklist lê; admin cadastra a estrutura e os locais; o líder liga os
-- checklists do setor dele à árvore.
ALTER TABLE public.gov_lugares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_processo_lugares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_local_setores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gov_lugares_ler ON public.gov_lugares;
CREATE POLICY gov_lugares_ler ON public.gov_lugares
  FOR SELECT TO authenticated USING (private.governanca_papel() IS NOT NULL);
DROP POLICY IF EXISTS gov_lugares_admin ON public.gov_lugares;
CREATE POLICY gov_lugares_admin ON public.gov_lugares
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');

DROP POLICY IF EXISTS gov_processo_lugares_ler ON public.gov_processo_lugares;
CREATE POLICY gov_processo_lugares_ler ON public.gov_processo_lugares
  FOR SELECT TO authenticated USING (private.gov_ve_processo(processo_id));
DROP POLICY IF EXISTS gov_processo_lugares_gerir ON public.gov_processo_lugares;
CREATE POLICY gov_processo_lugares_gerir ON public.gov_processo_lugares
  FOR ALL TO authenticated
  USING (private.gov_gerencia_processo(processo_id))
  WITH CHECK (private.gov_gerencia_processo(processo_id));

DROP POLICY IF EXISTS gov_local_setores_ler ON public.gov_local_setores;
CREATE POLICY gov_local_setores_ler ON public.gov_local_setores
  FOR SELECT TO authenticated USING (private.governanca_papel() IS NOT NULL);
DROP POLICY IF EXISTS gov_local_setores_admin ON public.gov_local_setores;
CREATE POLICY gov_local_setores_admin ON public.gov_local_setores
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');

-- Dados iniciais ------------------------------------------------------------------------

-- Cria (ou acha) um ponto da árvore e devolve o id.
CREATE OR REPLACE FUNCTION private.gov_lugar_semente(
  p_propriedade uuid, p_pai uuid, p_nivel text, p_nome text, p_ordem integer
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.gov_lugares
  WHERE propriedade_id = p_propriedade
    AND parent_id IS NOT DISTINCT FROM p_pai
    AND lower(btrim(nome)) = lower(btrim(p_nome));
  IF v_id IS NULL THEN
    INSERT INTO public.gov_lugares (propriedade_id, parent_id, nivel, nome, ordem)
    VALUES (p_propriedade, p_pai, p_nivel, p_nome, p_ordem)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- Cria (ou acha) um local específico de exemplo dentro de um tipo e liga a ele.
CREATE OR REPLACE FUNCTION private.gov_local_semente(p_propriedade uuid, p_lugar uuid, p_nome text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.gov_acomodacoes
  WHERE propriedade_id = p_propriedade AND lower(btrim(numero)) = lower(btrim(p_nome));
  IF v_id IS NULL THEN
    INSERT INTO public.gov_acomodacoes (numero, tipo, propriedade_id, lugar_id)
    VALUES (p_nome, 'area', p_propriedade, p_lugar)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.gov_acomodacoes SET lugar_id = coalesce(lugar_id, p_lugar) WHERE id = v_id;
  END IF;
  RETURN v_id;
END;
$$;

DO $$
DECLARE
  vivaz uuid;
  aqua uuid;
  -- categorias e tipos que recebem locais ou checklists
  v_hosp uuid; v_apto uuid; v_suite uuid;
  v_lazer uuid; v_piscinas uuid;
  v_comuns uuid; v_recepcao uuid; v_eventos uuid;
  v_ab uuid; v_restaurante uuid; v_bar uuid;
  v_verdes uuid;
  v_oper uuid; v_cm uuid; v_ete uuid; v_gerador uuid; v_gas uuid; v_agua uuid; v_residuos uuid; v_depositos uuid; v_oficina uuid;
  v_adm uuid; v_sanit uuid;
  a_lazer uuid; a_piscinas uuid; a_tobo uuid; a_rio uuid;
  a_atend uuid; a_ab uuid; a_lanchonete uuid; a_bar uuid;
  a_verdes uuid;
  a_oper uuid; a_cm uuid; a_depositos uuid; a_residuos uuid;
  a_adm uuid; a_bilheteria uuid; a_sanit uuid;
  r record;
  v_lugar uuid;
BEGIN
  SELECT id INTO vivaz FROM public.propriedades WHERE nome ILIKE '%vivaz%' ORDER BY nome LIMIT 1;
  SELECT id INTO aqua FROM public.propriedades WHERE nome ILIKE '%aquamania%' ORDER BY nome LIMIT 1;

  IF vivaz IS NOT NULL THEN
    -- Vivaz Cataratas: 8 categorias.
    v_hosp := private.gov_lugar_semente(vivaz, NULL, 'categoria', 'Hospedagem', 1);
    v_lazer := private.gov_lugar_semente(vivaz, NULL, 'categoria', 'Lazer', 2);
    v_comuns := private.gov_lugar_semente(vivaz, NULL, 'categoria', 'Áreas Comuns', 3);
    v_ab := private.gov_lugar_semente(vivaz, NULL, 'categoria', 'Alimentos e Bebidas', 4);
    v_verdes := private.gov_lugar_semente(vivaz, NULL, 'categoria', 'Áreas Verdes', 5);
    v_oper := private.gov_lugar_semente(vivaz, NULL, 'categoria', 'Operacional', 6);
    v_adm := private.gov_lugar_semente(vivaz, NULL, 'categoria', 'Administrativo', 7);
    v_sanit := private.gov_lugar_semente(vivaz, NULL, 'categoria', 'Sanitários', 8);

    v_apto := private.gov_lugar_semente(vivaz, v_hosp, 'tipo', 'UH Apartamento', 1);
    v_suite := private.gov_lugar_semente(vivaz, v_hosp, 'tipo', 'UH Suíte', 2);
    UPDATE public.gov_lugares SET tipo_uh = 'apartamento' WHERE id = v_apto;
    UPDATE public.gov_lugares SET tipo_uh = 'suite' WHERE id = v_suite;

    v_piscinas := private.gov_lugar_semente(vivaz, v_lazer, 'tipo', 'Piscinas', 1);
    PERFORM private.gov_lugar_semente(vivaz, v_lazer, 'tipo', 'Academia', 2);
    PERFORM private.gov_lugar_semente(vivaz, v_lazer, 'tipo', 'Kids Club', 3);
    PERFORM private.gov_lugar_semente(vivaz, v_lazer, 'tipo', 'Salão de jogos', 4);

    v_recepcao := private.gov_lugar_semente(vivaz, v_comuns, 'tipo', 'Recepção / Lobby', 1);
    PERFORM private.gov_lugar_semente(vivaz, v_comuns, 'tipo', 'Corredores', 2);
    PERFORM private.gov_lugar_semente(vivaz, v_comuns, 'tipo', 'Elevadores', 3);
    PERFORM private.gov_lugar_semente(vivaz, v_comuns, 'tipo', 'Estacionamento', 4);
    v_eventos := private.gov_lugar_semente(vivaz, v_comuns, 'tipo', 'Eventos', 5);

    v_restaurante := private.gov_lugar_semente(vivaz, v_ab, 'tipo', 'Restaurante', 1);
    v_bar := private.gov_lugar_semente(vivaz, v_ab, 'tipo', 'Bar', 2);
    PERFORM private.gov_lugar_semente(vivaz, v_ab, 'tipo', 'Café da manhã', 3);

    PERFORM private.gov_lugar_semente(vivaz, v_verdes, 'tipo', 'Jardins', 1);
    PERFORM private.gov_lugar_semente(vivaz, v_verdes, 'tipo', 'Trilhas', 2);
    PERFORM private.gov_lugar_semente(vivaz, v_verdes, 'tipo', 'Áreas externas', 3);

    v_cm := private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Casa de Máquinas', 1);
    v_ete := private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'ETE', 2);
    v_gerador := private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Gerador', 3);
    v_gas := private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Sistema de gás', 4);
    v_agua := private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Abastecimento de água', 5);
    v_depositos := private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Depósitos', 6);
    PERFORM private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Lavanderia', 7);
    PERFORM private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Cozinha', 8);
    PERFORM private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Rouparia', 9);
    v_residuos := private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Central de resíduos', 10);
    v_oficina := private.gov_lugar_semente(vivaz, v_oper, 'tipo', 'Oficina de manutenção', 11);

    PERFORM private.gov_lugar_semente(vivaz, v_adm, 'tipo', 'Escritórios', 1);
    PERFORM private.gov_lugar_semente(vivaz, v_adm, 'tipo', 'Vestiários de colaboradores', 2);
    PERFORM private.gov_lugar_semente(vivaz, v_adm, 'tipo', 'Refeitório', 3);

    PERFORM private.gov_lugar_semente(vivaz, v_sanit, 'tipo', 'Banheiros sociais', 1);
    PERFORM private.gov_lugar_semente(vivaz, v_sanit, 'tipo', 'Banheiros da área de lazer', 2);

    -- O que a ficha do local mostra, por categoria.
    UPDATE public.gov_lugares SET ficha_uh = true, grupos = '{eletronico,mobilia}' WHERE id = v_hosp;
    UPDATE public.gov_lugares SET grupos = '{equipamento,mobilia}' WHERE id IN (v_lazer, v_ab);
    UPDATE public.gov_lugares SET grupos = '{eletronico,mobilia}' WHERE id IN (v_comuns, v_adm);
    UPDATE public.gov_lugares SET grupos = '{equipamento}' WHERE id IN (v_verdes, v_oper);

    -- UHs: tipo (apartamento/suíte) e classificação (a categoria da planilha: Garden, Luxo...).
    FOR r IN
      SELECT id, tipo, categoria FROM public.gov_acomodacoes
      WHERE propriedade_id = vivaz AND tipo IN ('suite', 'apartamento') AND lugar_id IS NULL
    LOOP
      v_lugar := CASE WHEN r.tipo = 'suite' THEN v_suite ELSE v_apto END;
      IF r.categoria IS NOT NULL AND btrim(r.categoria) <> '' THEN
        v_lugar := private.gov_lugar_semente(vivaz, v_lugar, 'classificacao', initcap(lower(btrim(r.categoria))), 0);
      END IF;
      UPDATE public.gov_acomodacoes SET lugar_id = v_lugar WHERE id = r.id;
    END LOOP;

    -- Locais de exemplo tirados dos checklists.
    PERFORM private.gov_local_semente(vivaz, v_piscinas, 'Piscina adulto');
    PERFORM private.gov_local_semente(vivaz, v_piscinas, 'Piscina infantil');
    PERFORM private.gov_local_semente(vivaz, v_cm, 'Casa de máquinas das piscinas');
    PERFORM private.gov_local_semente(vivaz, v_ete, 'ETE');
    PERFORM private.gov_local_semente(vivaz, v_gerador, 'Gerador');
    PERFORM private.gov_local_semente(vivaz, v_gas, 'Central de gás');
    PERFORM private.gov_local_semente(vivaz, v_agua, 'Reservatórios de água');
    PERFORM private.gov_local_semente(vivaz, v_residuos, 'Depósito externo de lixo');
    PERFORM private.gov_local_semente(vivaz, v_restaurante, 'Restaurante Allegro');
    PERFORM private.gov_local_semente(vivaz, v_bar, 'Bar Gaia');
    PERFORM private.gov_local_semente(vivaz, v_recepcao, 'Recepção');

    -- As "áreas" antigas vão para o lugar certo.
    UPDATE public.gov_acomodacoes SET lugar_id = v_eventos
      WHERE propriedade_id = vivaz AND lugar_id IS NULL AND upper(btrim(numero)) = 'EVENTOS';
    UPDATE public.gov_acomodacoes SET lugar_id = v_restaurante
      WHERE propriedade_id = vivaz AND lugar_id IS NULL AND upper(btrim(numero)) = 'HOTEL A&B';
    UPDATE public.gov_acomodacoes SET lugar_id = v_oficina
      WHERE propriedade_id = vivaz AND lugar_id IS NULL AND upper(btrim(numero)) = 'MANUTENÇÃO';

    -- Etiquetas: UHs são cuidadas pela Governança e pela Manutenção.
    INSERT INTO public.gov_local_setores (local_id, setor_id)
    SELECT a.id, s.id
    FROM public.gov_acomodacoes a
    JOIN public.gov_setores s ON s.propriedade_id = vivaz AND (s.nome ILIKE 'governan%' OR s.nome ILIKE 'manuten%')
    WHERE a.propriedade_id = vivaz AND a.tipo IN ('suite', 'apartamento')
    ON CONFLICT DO NOTHING;

    -- Onde cada checklist importado se aplica (pelo id do Checklist Fácil).
    INSERT INTO public.gov_processo_lugares (processo_id, lugar_id)
    SELECT p.id, m.lugar
    FROM (VALUES
      ('493912', v_apto), ('527593', v_suite), ('608084', v_hosp),
      ('883500', v_oper), ('885825', v_piscinas), ('886436', v_ete), ('886590', v_ete),
      ('886621', v_verdes), ('887045', v_residuos), ('926747', v_eventos),
      ('967605', v_oper), ('968170', v_verdes)
    ) AS m(origem, lugar)
    JOIN public.gov_processos p ON p.codigo_origem = m.origem
    ON CONFLICT DO NOTHING;
    -- Feitos à mão (sem id do Checklist Fácil).
    INSERT INTO public.gov_processo_lugares (processo_id, lugar_id)
    SELECT p.id, v_hosp FROM public.gov_processos p
    WHERE p.codigo_origem IS NULL AND p.nome ILIKE '%pós-checkout%'
    ON CONFLICT DO NOTHING;
    INSERT INTO public.gov_processo_lugares (processo_id, lugar_id)
    SELECT p.id, v_oper FROM public.gov_processos p
    WHERE p.codigo_origem IS NULL AND p.nome ILIKE '%ronda operacional%'
    ON CONFLICT DO NOTHING;

    -- Etiquetas de setor do documento que ainda não existem na Vivaz.
    INSERT INTO public.gov_setores (propriedade_id, nome)
    SELECT vivaz, n FROM unnest(ARRAY['A&B', 'Lazer/Recreação', 'Segurança', 'Recepção', 'Administrativo']) AS n
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gov_setores s WHERE s.propriedade_id = vivaz AND lower(btrim(s.nome)) = lower(n)
    );
  END IF;

  IF aqua IS NOT NULL THEN
    -- Aquamania: 7 categorias (sem Hospedagem), com os mesmos nomes do hotel para filtrar junto.
    a_lazer := private.gov_lugar_semente(aqua, NULL, 'categoria', 'Lazer', 1);
    a_atend := private.gov_lugar_semente(aqua, NULL, 'categoria', 'Atendimento', 2);
    a_ab := private.gov_lugar_semente(aqua, NULL, 'categoria', 'Alimentos e Bebidas', 3);
    a_verdes := private.gov_lugar_semente(aqua, NULL, 'categoria', 'Áreas Verdes', 4);
    a_oper := private.gov_lugar_semente(aqua, NULL, 'categoria', 'Operacional', 5);
    a_adm := private.gov_lugar_semente(aqua, NULL, 'categoria', 'Administrativo', 6);
    a_sanit := private.gov_lugar_semente(aqua, NULL, 'categoria', 'Sanitários', 7);

    a_piscinas := private.gov_lugar_semente(aqua, a_lazer, 'tipo', 'Piscinas', 1);
    a_tobo := private.gov_lugar_semente(aqua, a_lazer, 'tipo', 'Toboáguas', 2);
    PERFORM private.gov_lugar_semente(aqua, a_lazer, 'tipo', 'Área infantil', 3);
    a_rio := private.gov_lugar_semente(aqua, a_lazer, 'tipo', 'Rio lento / Piscina de ondas', 4);

    PERFORM private.gov_lugar_semente(aqua, a_atend, 'tipo', 'Pavilhão de atendimento', 1);

    PERFORM private.gov_lugar_semente(aqua, a_ab, 'tipo', 'Quiosques', 1);
    a_lanchonete := private.gov_lugar_semente(aqua, a_ab, 'tipo', 'Lanchonete', 2);
    a_bar := private.gov_lugar_semente(aqua, a_ab, 'tipo', 'Bar', 3);

    PERFORM private.gov_lugar_semente(aqua, a_verdes, 'tipo', 'Jardins', 1);
    PERFORM private.gov_lugar_semente(aqua, a_verdes, 'tipo', 'Áreas de descanso', 2);

    a_cm := private.gov_lugar_semente(aqua, a_oper, 'tipo', 'Casas de Máquinas', 1);
    a_depositos := private.gov_lugar_semente(aqua, a_oper, 'tipo', 'Depósitos', 2);
    a_residuos := private.gov_lugar_semente(aqua, a_oper, 'tipo', 'Central de resíduos', 3);

    a_bilheteria := private.gov_lugar_semente(aqua, a_adm, 'tipo', 'Bilheteria', 1);
    PERFORM private.gov_lugar_semente(aqua, a_adm, 'tipo', 'Escritórios', 2);
    PERFORM private.gov_lugar_semente(aqua, a_adm, 'tipo', 'Vestiários de colaboradores', 3);

    PERFORM private.gov_lugar_semente(aqua, a_sanit, 'tipo', 'Banheiros e vestiários de clientes', 1);

    UPDATE public.gov_lugares SET grupos = '{equipamento,mobilia}' WHERE id IN (a_lazer, a_ab);
    UPDATE public.gov_lugares SET grupos = '{eletronico,mobilia}' WHERE id IN (a_atend, a_adm);
    UPDATE public.gov_lugares SET grupos = '{equipamento}' WHERE id IN (a_verdes, a_oper);

    -- Casas de máquinas (seções da "Inspeção semanal das casas de máquinas").
    FOR r IN SELECT unnest(ARRAY[
      'Casa de Máquinas 1', 'Casa de Máquinas 2', 'Casa de Máquinas 3', 'Casa de Máquinas 4',
      'Casa de Máquinas 5', 'Casa de Máquinas 6', 'Casa de Máquinas 7', 'Casa de Máquinas Rampa A',
      'Casa de Máquinas Rampa B', 'Bomba Rio Lento', 'Poço Tamanduá', 'Casa de Máquinas Piscina Escalada'
    ]) AS nome
    LOOP
      PERFORM private.gov_local_semente(aqua, a_cm, r.nome);
    END LOOP;
    PERFORM private.gov_local_semente(aqua, a_tobo, 'Rampa');
    PERFORM private.gov_local_semente(aqua, a_tobo, 'Adrenalina');
    PERFORM private.gov_local_semente(aqua, a_tobo, '3 Torres');
    PERFORM private.gov_local_semente(aqua, a_piscinas, 'Piscina Escalada');
    PERFORM private.gov_local_semente(aqua, a_rio, 'Rio Lento');
    PERFORM private.gov_local_semente(aqua, a_lanchonete, 'Lanchonete');
    PERFORM private.gov_local_semente(aqua, a_bar, 'Bar do parque');
    PERFORM private.gov_local_semente(aqua, a_bilheteria, 'Bilheteria');
    PERFORM private.gov_local_semente(aqua, a_depositos, 'Almoxarifado');
    PERFORM private.gov_local_semente(aqua, a_residuos, 'Ponto de armazenamento externo de resíduos');

    -- Casas de máquinas são da Manutenção.
    INSERT INTO public.gov_local_setores (local_id, setor_id)
    SELECT a.id, s.id
    FROM public.gov_acomodacoes a
    JOIN public.gov_setores s ON s.propriedade_id = aqua AND s.nome ILIKE 'manuten%'
    WHERE a.lugar_id = a_cm
    ON CONFLICT DO NOTHING;

    INSERT INTO public.gov_processo_lugares (processo_id, lugar_id)
    SELECT p.id, m.lugar
    FROM (VALUES
      ('888529', a_cm), ('891306', a_cm), ('892856', a_cm),
      ('892862', a_piscinas), ('916490', a_piscinas), ('917512', a_piscinas),
      ('891645', a_lazer),
      ('891629', a_residuos), ('892904', a_residuos), ('892933', a_residuos),
      ('891853', a_depositos), ('893304', a_depositos), ('893341', a_depositos), ('893349', a_depositos),
      ('892741', a_bilheteria), ('894489', a_bilheteria), ('893324', a_bilheteria),
      ('893378', a_ab), ('914471', a_ab), ('914786', a_ab), ('893428', a_ab)
    ) AS m(origem, lugar)
    JOIN public.gov_processos p ON p.codigo_origem = m.origem
    ON CONFLICT DO NOTHING;

    INSERT INTO public.gov_setores (propriedade_id, nome)
    SELECT aqua, n FROM unnest(ARRAY['Jardinagem', 'Segurança', 'Administrativo']) AS n
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gov_setores s WHERE s.propriedade_id = aqua AND lower(btrim(s.nome)) = lower(n)
    );
  END IF;
END $$;

-- Confere: locais ainda sem lugar na árvore (decidir onde ficam) e o tamanho da árvore.
SELECT p.nome AS unidade, a.numero AS local_sem_lugar
FROM public.gov_acomodacoes a
JOIN public.propriedades p ON p.id = a.propriedade_id
WHERE a.lugar_id IS NULL
ORDER BY p.nome, a.numero;
