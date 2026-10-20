-- Checklist como ambiente. Precisa de 20261020175900_checklist_ambiente_tipo.sql.
-- Quem marca Checklist no cadastro da equipe abre o painel de checklists;
-- desmarcado deixa de ver, inclusive o administrador.
-- O checklist passa a ser salvo aos poucos (em andamento) e o plano de ação
-- ganha a marcação de resolvido, para o Kanban acompanhar o andamento.

-- Ninguém ganha o Checklist automaticamente: o administrador marca em
-- Cadastros > Equipe quem usa. Solicitante nunca entra nos checklists.

CREATE OR REPLACE FUNCTION private.governanca_papel()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT ('checklist'::public.ambiente_equipe = ANY (u.ambientes)) THEN NULL
    WHEN u.role = 'solicitante'::user_role THEN NULL
    WHEN u.role = 'admin'::user_role THEN 'admin'
    ELSE COALESCE(u.governanca_papel, 'camareira')
  END
  FROM public.usuarios u
  WHERE u.id = auth.uid() AND u.ativo;
$$;

GRANT EXECUTE ON FUNCTION private.governanca_papel() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_definir_ambientes(
  p_user_id uuid,
  p_ambientes text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ambientes public.ambiente_equipe[];
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  IF p_ambientes IS NULL OR cardinality(p_ambientes) < 1 THEN
    RAISE EXCEPTION 'Marque Manutenção, TI ou Checklist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_ambientes) AS a
    WHERE a IS NULL OR a NOT IN ('manutencao', 'ti', 'checklist')
  ) THEN
    RAISE EXCEPTION 'Ambiente inválido';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT a::public.ambiente_equipe), '{}')
  INTO v_ambientes
  FROM unnest(p_ambientes) AS a;

  -- Solicitante só abre chamado: nunca fica com o Checklist.
  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = p_user_id AND role = 'solicitante'::user_role
  ) THEN
    v_ambientes := array_remove(v_ambientes, 'checklist'::public.ambiente_equipe);
    IF cardinality(v_ambientes) < 1 THEN
      RAISE EXCEPTION 'Marque Manutenção, TI ou os dois';
    END IF;
  END IF;

  UPDATE public.usuarios
  SET
    ambientes = v_ambientes,
    atualizado_em = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_definir_ambientes(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_definir_ambientes(uuid, text[]) TO authenticated;

-- Checklist em andamento: o próprio aplicador continua e finaliza --------------

DROP POLICY IF EXISTS gov_inspecoes_continuar ON public.gov_inspecoes;
CREATE POLICY gov_inspecoes_continuar ON public.gov_inspecoes
  FOR UPDATE TO authenticated
  USING (
    inspetor_id = auth.uid()
    AND status = 'em_andamento'
    AND private.governanca_papel() IS NOT NULL
  )
  WITH CHECK (inspetor_id = auth.uid());

DROP POLICY IF EXISTS gov_inspecoes_descartar ON public.gov_inspecoes;
CREATE POLICY gov_inspecoes_descartar ON public.gov_inspecoes
  FOR DELETE TO authenticated
  USING (inspetor_id = auth.uid() AND status = 'em_andamento');

DROP POLICY IF EXISTS gov_respostas_continuar ON public.gov_respostas;
CREATE POLICY gov_respostas_continuar ON public.gov_respostas
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gov_inspecoes i
      WHERE i.id = inspecao_id
        AND i.inspetor_id = auth.uid()
        AND i.status = 'em_andamento'
    )
  );

DROP POLICY IF EXISTS gov_respostas_refazer ON public.gov_respostas;
CREATE POLICY gov_respostas_refazer ON public.gov_respostas
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gov_inspecoes i
      WHERE i.id = inspecao_id
        AND i.inspetor_id = auth.uid()
        AND i.status = 'em_andamento'
    )
  );

DROP POLICY IF EXISTS gov_planos_acao_refazer ON public.gov_planos_acao;
CREATE POLICY gov_planos_acao_refazer ON public.gov_planos_acao
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.gov_respostas r
      JOIN public.gov_inspecoes i ON i.id = r.inspecao_id
      WHERE r.id = resposta_id
        AND i.inspetor_id = auth.uid()
        AND i.status = 'em_andamento'
    )
  );

-- Plano de ação resolvido ------------------------------------------------------

ALTER TABLE public.gov_planos_acao
  ADD COLUMN IF NOT EXISTS resolvido_em timestamptz,
  ADD COLUMN IF NOT EXISTS resolvido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS gov_planos_acao_resolver ON public.gov_planos_acao;
CREATE POLICY gov_planos_acao_resolver ON public.gov_planos_acao
  FOR UPDATE TO authenticated
  USING (private.governanca_papel() IN ('admin', 'lider'))
  WITH CHECK (private.governanca_papel() IN ('admin', 'lider'));

CREATE INDEX IF NOT EXISTS gov_inspecoes_status_idx ON public.gov_inspecoes (status);

-- Kanban em tempo real ---------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gov_inspecoes', 'gov_respostas', 'gov_planos_acao'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;
