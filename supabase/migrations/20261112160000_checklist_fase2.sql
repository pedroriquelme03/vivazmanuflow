-- Checklist, Fase 2: cada um vê e mexe só no próprio setor, e o checklist em andamento
-- pode ser pausado, cancelado ou excluído.
--   * Inspeção ganha status 'pausada' e 'cancelada' e a data de referência (o dia a que o
--     checklist se refere; início e fim continuam sendo gravados sozinhos).
--   * Checklist pode pedir uma área (casa de máquinas, bilheteria...) em vez de UH.
--   * Líder edita os checklists (dados, seções e perguntas) dos próprios setores.
--   * Líder e aplicador veem só os checklists, as inspeções e os colaboradores dos próprios
--     setores (marcados em Checklist > Setores). O admin vê tudo.
--   * Admin e líder do setor continuam, pausam, cancelam e excluem o checklist em andamento
--     de outra pessoa. O aplicador pausa, retoma e descarta o próprio.
-- Precisa de 20261112120000_checklist_setores.sql. Pode rodar de novo.

-- Inspeção: status novos e data de referência -------------------------------------

ALTER TABLE public.gov_inspecoes DROP CONSTRAINT IF EXISTS gov_inspecoes_status_check;
ALTER TABLE public.gov_inspecoes
  ADD CONSTRAINT gov_inspecoes_status_check
  CHECK (status IN ('em_andamento', 'pausada', 'cancelada', 'finalizada'));

ALTER TABLE public.gov_inspecoes
  ADD COLUMN IF NOT EXISTS data_referencia date;
UPDATE public.gov_inspecoes
SET data_referencia = (criado_em AT TIME ZONE 'America/Sao_Paulo')::date
WHERE data_referencia IS NULL;
ALTER TABLE public.gov_inspecoes
  ALTER COLUMN data_referencia SET DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  ALTER COLUMN data_referencia SET NOT NULL;

CREATE INDEX IF NOT EXISTS gov_inspecoes_data_referencia_idx ON public.gov_inspecoes (data_referencia DESC);

-- Checklist que pede uma área (em vez de UH).
ALTER TABLE public.gov_processos DROP CONSTRAINT IF EXISTS gov_processos_tipo_check;
ALTER TABLE public.gov_processos
  ADD CONSTRAINT gov_processos_tipo_check CHECK (tipo IN ('suite', 'apartamento', 'ambos', 'area'));

-- Quem cuida de quê ------------------------------------------------------------------

-- Admin cuida de todos os setores; o líder, dos marcados para ele.
CREATE OR REPLACE FUNCTION private.gov_gerencia_setor(p_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE eu.papel
    WHEN 'admin' THEN true
    WHEN 'lider' THEN EXISTS (
      SELECT 1 FROM public.gov_usuario_setores us
      WHERE us.usuario_id = auth.uid() AND us.setor_id = p_setor_id
    )
    ELSE false
  END
  FROM (SELECT private.governanca_papel() AS papel) eu;
$$;

CREATE OR REPLACE FUNCTION private.gov_ve_processo(p_processo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT private.gov_ve_setor(p.setor_id) FROM public.gov_processos p WHERE p.id = p_processo_id), false);
$$;

CREATE OR REPLACE FUNCTION private.gov_gerencia_processo(p_processo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT private.gov_gerencia_setor(p.setor_id) FROM public.gov_processos p WHERE p.id = p_processo_id),
    false
  );
$$;

CREATE OR REPLACE FUNCTION private.gov_gerencia_secao(p_secao_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT private.gov_gerencia_processo(s.processo_id) FROM public.gov_secoes s WHERE s.id = p_secao_id),
    false
  );
$$;

-- Pode lançar respostas e planos: inspeção aberta (em andamento ou pausada) e a pessoa é
-- quem aplica ou cuida do setor do checklist.
CREATE OR REPLACE FUNCTION private.gov_edita_inspecao(p_inspecao_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT i.status IN ('em_andamento', 'pausada')
       AND private.governanca_papel() IS NOT NULL
       AND (i.inspetor_id = auth.uid() OR private.gov_gerencia_processo(i.processo_id))
    FROM public.gov_inspecoes i
    WHERE i.id = p_inspecao_id
  ), false);
$$;

CREATE OR REPLACE FUNCTION private.gov_edita_resposta(p_resposta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT private.gov_edita_inspecao(r.inspecao_id) FROM public.gov_respostas r WHERE r.id = p_resposta_id),
    false
  );
$$;

CREATE OR REPLACE FUNCTION private.gov_gerencia_resposta(p_resposta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT private.gov_gerencia_processo(i.processo_id)
    FROM public.gov_respostas r
    JOIN public.gov_inspecoes i ON i.id = r.inspecao_id
    WHERE r.id = p_resposta_id
  ), false);
$$;

GRANT EXECUTE ON FUNCTION
  private.gov_gerencia_setor(uuid),
  private.gov_ve_processo(uuid),
  private.gov_gerencia_processo(uuid),
  private.gov_gerencia_secao(uuid),
  private.gov_edita_inspecao(uuid),
  private.gov_edita_resposta(uuid),
  private.gov_gerencia_resposta(uuid)
TO authenticated;

-- Checklists (modelos): cada um vê os do próprio setor; o líder edita os do próprio setor.

DROP POLICY IF EXISTS gov_processos_ler ON public.gov_processos;
CREATE POLICY gov_processos_ler ON public.gov_processos
  FOR SELECT TO authenticated
  USING (private.gov_ve_setor(setor_id));

DROP POLICY IF EXISTS gov_processos_lider_criar ON public.gov_processos;
CREATE POLICY gov_processos_lider_criar ON public.gov_processos
  FOR INSERT TO authenticated
  WITH CHECK (private.gov_gerencia_setor(setor_id));

DROP POLICY IF EXISTS gov_processos_lider_editar ON public.gov_processos;
CREATE POLICY gov_processos_lider_editar ON public.gov_processos
  FOR UPDATE TO authenticated
  USING (private.gov_gerencia_setor(setor_id))
  WITH CHECK (private.gov_gerencia_setor(setor_id));

DROP POLICY IF EXISTS gov_processos_lider_remover ON public.gov_processos;
CREATE POLICY gov_processos_lider_remover ON public.gov_processos
  FOR DELETE TO authenticated
  USING (private.gov_gerencia_setor(setor_id));

DROP POLICY IF EXISTS gov_secoes_lider_criar ON public.gov_secoes;
CREATE POLICY gov_secoes_lider_criar ON public.gov_secoes
  FOR INSERT TO authenticated
  WITH CHECK (private.gov_gerencia_processo(processo_id));

DROP POLICY IF EXISTS gov_secoes_lider_editar ON public.gov_secoes;
CREATE POLICY gov_secoes_lider_editar ON public.gov_secoes
  FOR UPDATE TO authenticated
  USING (private.gov_gerencia_processo(processo_id))
  WITH CHECK (private.gov_gerencia_processo(processo_id));

DROP POLICY IF EXISTS gov_secoes_lider_remover ON public.gov_secoes;
CREATE POLICY gov_secoes_lider_remover ON public.gov_secoes
  FOR DELETE TO authenticated
  USING (private.gov_gerencia_processo(processo_id));

DROP POLICY IF EXISTS gov_perguntas_lider_criar ON public.gov_perguntas;
CREATE POLICY gov_perguntas_lider_criar ON public.gov_perguntas
  FOR INSERT TO authenticated
  WITH CHECK (private.gov_gerencia_secao(secao_id));

DROP POLICY IF EXISTS gov_perguntas_lider_editar ON public.gov_perguntas;
CREATE POLICY gov_perguntas_lider_editar ON public.gov_perguntas
  FOR UPDATE TO authenticated
  USING (private.gov_gerencia_secao(secao_id))
  WITH CHECK (private.gov_gerencia_secao(secao_id));

DROP POLICY IF EXISTS gov_perguntas_lider_remover ON public.gov_perguntas;
CREATE POLICY gov_perguntas_lider_remover ON public.gov_perguntas
  FOR DELETE TO authenticated
  USING (private.gov_gerencia_secao(secao_id));

-- Colaboradores: agora cada um vê só os dos próprios setores.
DROP POLICY IF EXISTS gov_camareiras_ler ON public.gov_camareiras;
CREATE POLICY gov_camareiras_ler ON public.gov_camareiras
  FOR SELECT TO authenticated
  USING (private.gov_ve_setor(setor_id));

-- Inspeções ---------------------------------------------------------------------------

DROP POLICY IF EXISTS gov_inspecoes_ler ON public.gov_inspecoes;
CREATE POLICY gov_inspecoes_ler ON public.gov_inspecoes
  FOR SELECT TO authenticated
  USING (
    (inspetor_id = auth.uid() AND private.governanca_papel() IS NOT NULL)
    OR private.gov_gerencia_processo(processo_id)
  );

DROP POLICY IF EXISTS gov_inspecoes_criar ON public.gov_inspecoes;
CREATE POLICY gov_inspecoes_criar ON public.gov_inspecoes
  FOR INSERT TO authenticated
  WITH CHECK (
    inspetor_id = auth.uid()
    AND status = 'em_andamento'
    AND private.gov_ve_processo(processo_id)
    -- Só líder e admin escolhem o colaborador.
    AND (camareira_id IS NULL OR private.governanca_papel() IN ('admin', 'lider'))
  );

-- Quem aplica: continua, pausa, retoma e finaliza o próprio.
-- Líder do setor: tudo isso e também cancela, no checklist ainda não finalizado.
DROP POLICY IF EXISTS gov_inspecoes_continuar ON public.gov_inspecoes;
CREATE POLICY gov_inspecoes_continuar ON public.gov_inspecoes
  FOR UPDATE TO authenticated
  USING (
    status <> 'finalizada'
    AND (
      (inspetor_id = auth.uid() AND status IN ('em_andamento', 'pausada') AND private.governanca_papel() IS NOT NULL)
      OR private.gov_gerencia_processo(processo_id)
    )
  )
  WITH CHECK (
    (
      inspetor_id = auth.uid()
      AND status IN ('em_andamento', 'pausada', 'finalizada')
      AND private.gov_ve_processo(processo_id)
    )
    OR private.gov_gerencia_processo(processo_id)
  );

DROP POLICY IF EXISTS gov_inspecoes_descartar ON public.gov_inspecoes;
CREATE POLICY gov_inspecoes_descartar ON public.gov_inspecoes
  FOR DELETE TO authenticated
  USING (
    status <> 'finalizada'
    AND (
      (inspetor_id = auth.uid() AND status IN ('em_andamento', 'pausada'))
      OR private.gov_gerencia_processo(processo_id)
    )
  );

-- Respostas e planos: lança quem pode mexer na inspeção aberta.
DROP POLICY IF EXISTS gov_respostas_criar ON public.gov_respostas;
CREATE POLICY gov_respostas_criar ON public.gov_respostas
  FOR INSERT TO authenticated
  WITH CHECK (private.gov_edita_inspecao(inspecao_id));

DROP POLICY IF EXISTS gov_respostas_continuar ON public.gov_respostas;
CREATE POLICY gov_respostas_continuar ON public.gov_respostas
  FOR UPDATE TO authenticated
  USING (private.gov_edita_inspecao(inspecao_id))
  WITH CHECK (private.gov_edita_inspecao(inspecao_id));

DROP POLICY IF EXISTS gov_respostas_refazer ON public.gov_respostas;
CREATE POLICY gov_respostas_refazer ON public.gov_respostas
  FOR DELETE TO authenticated
  USING (private.gov_edita_inspecao(inspecao_id));

DROP POLICY IF EXISTS gov_planos_acao_criar ON public.gov_planos_acao;
CREATE POLICY gov_planos_acao_criar ON public.gov_planos_acao
  FOR INSERT TO authenticated
  WITH CHECK (private.gov_edita_resposta(resposta_id));

DROP POLICY IF EXISTS gov_planos_acao_refazer ON public.gov_planos_acao;
CREATE POLICY gov_planos_acao_refazer ON public.gov_planos_acao
  FOR DELETE TO authenticated
  USING (private.gov_edita_resposta(resposta_id));

-- Resolver plano: admin ou líder do setor do checklist.
DROP POLICY IF EXISTS gov_planos_acao_resolver ON public.gov_planos_acao;
CREATE POLICY gov_planos_acao_resolver ON public.gov_planos_acao
  FOR UPDATE TO authenticated
  USING (private.gov_gerencia_resposta(resposta_id))
  WITH CHECK (private.gov_gerencia_resposta(resposta_id));
