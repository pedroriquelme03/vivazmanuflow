-- Checklist, Fase 1: Propriedade -> Setor -> Checklists.
--   * gov_setores: setores de cada propriedade (Vivaz, Aquamania).
--   * Colaboradores (tabela gov_camareiras) ganham setor: nome + setor, sem login.
--   * Locais (tabela gov_acomodacoes) ganham propriedade; o tipo 'setor' vira 'area',
--     porque "setor" agora é o setor do checklist. Local é UH (suíte/apartamento) ou área.
--   * gov_usuario_setores: setores que cada líder/aplicador enxerga (admin vê todos).
--   * O líder só cadastra, edita e remove colaboradores dos próprios setores
--     (a leitura dos nomes continua aberta no módulo até a Fase 2 filtrar as inspeções).
--   * Checklist e colaborador sempre têm setor; local sempre tem propriedade.
--   * Colaborador que já aparece em checklist aplicado não pode ser apagado (só inativado),
--     e o colaborador escolhido precisa ser do setor do checklist.
-- As tabelas mantêm o nome antigo para não quebrar telas e relatórios que já usam.
-- Rodar junto com a publicação do código: o código antigo não preenche setor/propriedade.
-- Precisa de 20261106140000_plano_acao_abre_chamado.sql.
-- Pode rodar de novo: a carga inicial só acontece quando ainda não há setores.

-- Setores ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gov_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propriedade_id uuid NOT NULL REFERENCES public.propriedades(id) ON DELETE RESTRICT,
  nome text NOT NULL CHECK (btrim(nome) <> ''),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gov_setores_nome_unico
  ON public.gov_setores (propriedade_id, lower(btrim(nome)));

CREATE TABLE IF NOT EXISTS public.gov_usuario_setores (
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  setor_id uuid NOT NULL REFERENCES public.gov_setores(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, setor_id)
);

-- Colaboradores, locais e checklists ------------------------------------------------

ALTER TABLE public.gov_camareiras
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.gov_setores(id) ON DELETE RESTRICT;
COMMENT ON TABLE public.gov_camareiras IS
  'Colaboradores do checklist (nome + setor, sem login). Nome da tabela mantido por compatibilidade.';

ALTER TABLE public.gov_acomodacoes
  ADD COLUMN IF NOT EXISTS propriedade_id uuid REFERENCES public.propriedades(id) ON DELETE RESTRICT;
COMMENT ON TABLE public.gov_acomodacoes IS
  'Locais do checklist: UH (suite/apartamento) ou area. Nome da tabela mantido por compatibilidade.';

ALTER TABLE public.gov_acomodacoes DROP CONSTRAINT IF EXISTS gov_acomodacoes_tipo_check;
UPDATE public.gov_acomodacoes SET tipo = 'area' WHERE tipo = 'setor';
ALTER TABLE public.gov_acomodacoes
  ADD CONSTRAINT gov_acomodacoes_tipo_check CHECK (tipo IN ('suite', 'apartamento', 'area'));

-- O mesmo nome pode existir em propriedades diferentes (ex.: Recepção na Vivaz e no Aquamania).
ALTER TABLE public.gov_acomodacoes DROP CONSTRAINT IF EXISTS gov_acomodacoes_numero_key;
CREATE UNIQUE INDEX IF NOT EXISTS gov_acomodacoes_nome_unico
  ON public.gov_acomodacoes (propriedade_id, lower(btrim(numero)));

ALTER TABLE public.gov_processos
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.gov_setores(id) ON DELETE RESTRICT;
COMMENT ON COLUMN public.gov_processos.categoria IS 'Obsoleto: o checklist é organizado por setor_id.';

CREATE INDEX IF NOT EXISTS gov_processos_setor_idx ON public.gov_processos (setor_id);
CREATE INDEX IF NOT EXISTS gov_camareiras_setor_idx ON public.gov_camareiras (setor_id);

-- Quem já foi avaliado fica no histórico: apagar o colaborador é bloqueado.
ALTER TABLE public.gov_inspecoes DROP CONSTRAINT IF EXISTS gov_inspecoes_camareira_id_fkey;
ALTER TABLE public.gov_inspecoes
  ADD CONSTRAINT gov_inspecoes_camareira_id_fkey
  FOREIGN KEY (camareira_id) REFERENCES public.gov_camareiras(id) ON DELETE RESTRICT;

-- Carga inicial ------------------------------------------------------------------
-- Setores saem da categoria atual dos checklists (GOVERNANÇA, MANUTENÇÃO...).
-- AQUAMANIA vai para a propriedade Aquamania, setor "Geral"; o resto fica na Vivaz
-- (checklist sem categoria vai para Vivaz > Geral).
-- Camareiras vão para Governança. Quem já usa o checklist continua vendo tudo.

DO $$
DECLARE
  v_vivaz uuid;
  v_aquamania uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.gov_setores) THEN
    RETURN;
  END IF;

  SELECT id INTO v_vivaz FROM public.propriedades
  WHERE nome ILIKE '%vivaz%' ORDER BY criado_em LIMIT 1;
  SELECT id INTO v_aquamania FROM public.propriedades
  WHERE nome ILIKE '%aquamania%' ORDER BY criado_em LIMIT 1;

  IF v_vivaz IS NULL OR v_aquamania IS NULL THEN
    RAISE EXCEPTION 'Cadastre Vivaz e Aquamania em Cadastros > Locais principais antes de rodar este SQL.';
  END IF;

  -- Categoria de cada checklist já convertida em (propriedade, nome do setor).
  CREATE TEMP TABLE gov_setor_da_categoria ON COMMIT DROP AS
  SELECT
    p.id AS processo_id,
    CASE WHEN upper(btrim(p.categoria)) LIKE 'AQUAMANIA%' THEN v_aquamania ELSE v_vivaz END AS propriedade_id,
    CASE
      WHEN nullif(btrim(p.categoria), '') IS NULL OR upper(btrim(p.categoria)) LIKE 'AQUAMANIA%' THEN 'Geral'
      ELSE initcap(lower(btrim(p.categoria)))
    END AS nome
  FROM public.gov_processos p;

  INSERT INTO public.gov_setores (propriedade_id, nome)
  SELECT DISTINCT propriedade_id, nome FROM gov_setor_da_categoria
  UNION SELECT v_vivaz, 'Governança'
  ON CONFLICT DO NOTHING;

  UPDATE public.gov_processos p
  SET setor_id = s.id
  FROM gov_setor_da_categoria c
  JOIN public.gov_setores s ON s.propriedade_id = c.propriedade_id AND lower(s.nome) = lower(c.nome)
  WHERE p.id = c.processo_id AND p.setor_id IS NULL;

  UPDATE public.gov_camareiras c
  SET setor_id = s.id
  FROM public.gov_setores s
  WHERE c.setor_id IS NULL AND s.propriedade_id = v_vivaz AND lower(s.nome) = 'governança';

  UPDATE public.gov_acomodacoes
  SET propriedade_id = CASE WHEN numero ILIKE 'AQUAMANIA%' THEN v_aquamania ELSE v_vivaz END
  WHERE propriedade_id IS NULL;

  INSERT INTO public.gov_usuario_setores (usuario_id, setor_id)
  SELECT u.id, s.id
  FROM public.usuarios u
  CROSS JOIN public.gov_setores s
  WHERE 'checklist'::public.ambiente_equipe = ANY (u.ambientes)
    AND u.role NOT IN ('admin'::public.user_role, 'solicitante'::public.user_role)
  ON CONFLICT DO NOTHING;
END;
$$;

ALTER TABLE public.gov_processos ALTER COLUMN setor_id SET NOT NULL;
ALTER TABLE public.gov_camareiras ALTER COLUMN setor_id SET NOT NULL;
ALTER TABLE public.gov_acomodacoes ALTER COLUMN propriedade_id SET NOT NULL;

-- Quem enxerga o setor -------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.gov_ve_setor(p_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN eu.papel IS NULL THEN false
    WHEN eu.papel = 'admin' THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.gov_usuario_setores us
      WHERE us.usuario_id = auth.uid() AND us.setor_id = p_setor_id
    )
  END
  FROM (SELECT private.governanca_papel() AS papel) eu;
$$;

GRANT EXECUTE ON FUNCTION private.gov_ve_setor(uuid) TO authenticated;

-- O colaborador avaliado precisa ser do setor do checklist.
CREATE OR REPLACE FUNCTION private.gov_inspecao_colaborador_do_setor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só confere o que mudou: rascunhos antigos continuam salvando normalmente.
  IF TG_OP = 'UPDATE'
     AND NEW.camareira_id IS NOT DISTINCT FROM OLD.camareira_id
     AND NEW.processo_id IS NOT DISTINCT FROM OLD.processo_id THEN
    RETURN NEW;
  END IF;
  IF NEW.camareira_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.gov_camareiras c
    JOIN public.gov_processos p ON p.id = NEW.processo_id
    WHERE c.id = NEW.camareira_id AND c.setor_id = p.setor_id
  ) THEN
    RAISE EXCEPTION 'O colaborador escolhido não é do setor deste checklist.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gov_inspecoes_colaborador_do_setor ON public.gov_inspecoes;
CREATE TRIGGER gov_inspecoes_colaborador_do_setor
  BEFORE INSERT OR UPDATE OF camareira_id, processo_id ON public.gov_inspecoes
  FOR EACH ROW
  EXECUTE FUNCTION private.gov_inspecao_colaborador_do_setor();

-- RLS ------------------------------------------------------------------------------

ALTER TABLE public.gov_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_usuario_setores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gov_setores_ler ON public.gov_setores;
CREATE POLICY gov_setores_ler ON public.gov_setores
  FOR SELECT TO authenticated
  USING (private.governanca_papel() IS NOT NULL);

DROP POLICY IF EXISTS gov_setores_admin ON public.gov_setores;
CREATE POLICY gov_setores_admin ON public.gov_setores
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');

DROP POLICY IF EXISTS gov_usuario_setores_ler ON public.gov_usuario_setores;
CREATE POLICY gov_usuario_setores_ler ON public.gov_usuario_setores
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR private.governanca_papel() = 'admin');

DROP POLICY IF EXISTS gov_usuario_setores_admin ON public.gov_usuario_setores;
CREATE POLICY gov_usuario_setores_admin ON public.gov_usuario_setores
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');

-- Colaboradores: a leitura continua aberta a quem usa o checklist (o nome aparece no
-- histórico das inspeções); o líder cadastra, edita e remove só nos próprios setores.
-- A visão por setor das inspeções vem na Fase 2.
DROP POLICY IF EXISTS gov_camareiras_lider ON public.gov_camareiras;

DROP POLICY IF EXISTS gov_camareiras_lider_criar ON public.gov_camareiras;
CREATE POLICY gov_camareiras_lider_criar ON public.gov_camareiras
  FOR INSERT TO authenticated
  WITH CHECK (private.governanca_papel() = 'lider' AND private.gov_ve_setor(setor_id));

DROP POLICY IF EXISTS gov_camareiras_lider_editar ON public.gov_camareiras;
CREATE POLICY gov_camareiras_lider_editar ON public.gov_camareiras
  FOR UPDATE TO authenticated
  USING (private.governanca_papel() = 'lider' AND private.gov_ve_setor(setor_id))
  WITH CHECK (private.governanca_papel() = 'lider' AND private.gov_ve_setor(setor_id));

DROP POLICY IF EXISTS gov_camareiras_lider_remover ON public.gov_camareiras;
CREATE POLICY gov_camareiras_lider_remover ON public.gov_camareiras
  FOR DELETE TO authenticated
  USING (private.governanca_papel() = 'lider' AND private.gov_ve_setor(setor_id));

-- Chamado do plano de ação: área sai sem "UH" e usa a propriedade do local ------------

CREATE OR REPLACE FUNCTION private.gov_abrir_chamados_inspecao(p_inspecao_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_insp record;
  v_plano record;
  v_usuario record;
  v_propriedade uuid;
  v_solicitante uuid;
  v_onde text;
  v_titulo text;
  v_descricao text;
  v_anexos jsonb;
  v_demanda uuid;
  v_token text;
  v_abertos integer := 0;
BEGIN
  SELECT i.id, i.inspetor_id, p.nome AS checklist, a.numero AS uh, a.tipo AS tipo_uh,
         a.propriedade_id AS propriedade_local, c.nome AS camareira
    INTO v_insp
  FROM public.gov_inspecoes i
  JOIN public.gov_processos p ON p.id = i.processo_id
  LEFT JOIN public.gov_acomodacoes a ON a.id = i.acomodacao_id
  LEFT JOIN public.gov_camareiras c ON c.id = i.camareira_id
  WHERE i.id = p_inspecao_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Quem fez a vistoria é o solicitante do chamado.
  SELECT u.nome, u.propriedade_id INTO v_usuario
  FROM public.usuarios u
  WHERE u.id = v_insp.inspetor_id;

  v_propriedade := coalesce(v_insp.propriedade_local, v_usuario.propriedade_id);
  IF v_propriedade IS NULL THEN
    SELECT pr.id INTO v_propriedade
    FROM public.propriedades pr
    WHERE pr.ativo
    ORDER BY pr.criado_em
    LIMIT 1;
  END IF;
  IF v_propriedade IS NULL OR v_usuario.nome IS NULL THEN
    RAISE WARNING 'Checklist % sem propriedade ou inspetor para abrir chamado', p_inspecao_id;
    RETURN 0;
  END IF;

  SELECT s.id INTO v_solicitante
  FROM public.solicitantes s
  WHERE s.propriedade_id = v_propriedade
    AND lower(trim(s.nome)) = lower(trim(v_usuario.nome))
  ORDER BY s.ativo DESC, s.criado_em
  LIMIT 1;
  IF v_solicitante IS NULL THEN
    INSERT INTO public.solicitantes (nome, propriedade_id)
    VALUES (trim(v_usuario.nome), v_propriedade)
    RETURNING id INTO v_solicitante;
  END IF;

  v_onde := CASE
    WHEN v_insp.uh IS NULL THEN NULL
    WHEN v_insp.tipo_uh = 'area' THEN v_insp.uh
    ELSE 'UH ' || v_insp.uh
  END;

  FOR v_plano IN
    SELECT pa.id, pa.prioridade, pa.o_que_fazer, pa.quem_vai_fazer, pa.quem_pediu, pa.observacao,
           r.pergunta_texto, r.secao_nome, r.comentario, r.anexo_url
    FROM public.gov_planos_acao pa
    JOIN public.gov_respostas r ON r.id = pa.resposta_id
    WHERE r.inspecao_id = p_inspecao_id
      AND pa.demanda_id IS NULL
      AND pa.resolvido_em IS NULL
    ORDER BY r.secao_ordem, r.pergunta_ordem
  LOOP
    BEGIN
      v_titulo := left(
        coalesce(v_onde || ' - ', '') || trim(v_plano.o_que_fazer),
        150
      );
      v_descricao := concat_ws(E'\n',
        'Aberto pelo plano de ação do checklist "' || v_insp.checklist || '".',
        'Item reprovado: ' || v_plano.pergunta_texto,
        CASE WHEN v_plano.secao_nome IS NOT NULL THEN 'Seção: ' || v_plano.secao_nome END,
        CASE WHEN v_onde IS NOT NULL THEN 'Local: ' || v_onde END,
        CASE WHEN v_insp.camareira IS NOT NULL THEN 'Colaborador: ' || v_insp.camareira END,
        'O que fazer: ' || v_plano.o_que_fazer,
        CASE WHEN v_plano.quem_vai_fazer IS NOT NULL THEN 'Quem vai fazer: ' || v_plano.quem_vai_fazer END,
        CASE WHEN v_plano.quem_pediu IS NOT NULL THEN 'Quem pediu: ' || v_plano.quem_pediu END,
        CASE WHEN v_plano.comentario IS NOT NULL THEN 'Comentário: ' || v_plano.comentario END,
        CASE WHEN v_plano.observacao IS NOT NULL THEN 'Observação: ' || v_plano.observacao END
      );
      v_anexos := CASE
        WHEN v_plano.anexo_url IS NULL THEN '[]'::jsonb
        WHEN v_plano.anexo_url ~* '\.pdf($|\?)' THEN jsonb_build_array(jsonb_build_object('url', v_plano.anexo_url, 'tipo', 'documento'))
        WHEN v_plano.anexo_url ~* '\.(mp4|mov|webm)($|\?)' THEN jsonb_build_array(jsonb_build_object('url', v_plano.anexo_url, 'tipo', 'video'))
        ELSE jsonb_build_array(jsonb_build_object('url', v_plano.anexo_url, 'tipo', 'foto'))
      END;

      SELECT a.demanda_id, a.token::text
        INTO v_demanda, v_token
      FROM public.abrir_demanda(
        p_solicitante_id => v_solicitante,
        p_titulo => v_titulo,
        p_descricao => v_descricao,
        p_prioridade => v_plano.prioridade::public.demanda_prioridade,
        p_anexos => v_anexos
      ) a;

      -- Garante o quadro da Manutenção, quem abriu e o local do chamado.
      UPDATE public.demandas
      SET ambiente = 'manutencao'::public.ambiente_equipe,
          aberto_por = coalesce(aberto_por, v_insp.inspetor_id),
          sublocal = coalesce(v_onde, sublocal)
      WHERE id = v_demanda;

      UPDATE public.gov_planos_acao
      SET demanda_id = v_demanda, chamado_token = v_token
      WHERE id = v_plano.id;

      v_abertos := v_abertos + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Plano de ação % não abriu chamado: %', v_plano.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_abertos;
END;
$$;

REVOKE ALL ON FUNCTION private.gov_abrir_chamados_inspecao(uuid) FROM PUBLIC;
