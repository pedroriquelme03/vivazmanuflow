-- 1) Colaborador precisa LER a demanda depois de pegar (e quando o solicitante
--    contesta e ela volta). A política de pool só vale com status aberta e
--    sem responsável — ao pegar, a demanda sumia de Minhas.
-- 2) Admin altera membros depois de criar: GRANT + função estável + políticas.

DROP POLICY IF EXISTS "dem_sel_colab_propria" ON public.demandas;
CREATE POLICY "dem_sel_colab_propria"
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (colaborador_id = auth.uid());

DROP POLICY IF EXISTS "dem_sel_staff" ON public.demandas;
CREATE POLICY "dem_sel_staff"
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (
    private.meu_role() = 'admin'::user_role
    OR (
      private.meu_role() = 'lider'::user_role
      AND (
        projeto_id IS NULL
        OR public.eh_membro_projeto(projeto_id, auth.uid())
      )
    )
    OR colaborador_id = auth.uid()
  );

GRANT SELECT, INSERT, DELETE, UPDATE ON public.projeto_membros TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.projetos TO authenticated;

DROP POLICY IF EXISTS "projeto_membros_select" ON public.projeto_membros;
CREATE POLICY "projeto_membros_select"
  ON public.projeto_membros
  FOR SELECT
  TO authenticated
  USING (
    private.meu_role() = 'admin'::user_role
    OR usuario_id = auth.uid()
    OR projeto_id IN (SELECT public.projetos_do_usuario(auth.uid()))
  );

DROP POLICY IF EXISTS "projeto_membros_admin" ON public.projeto_membros;
CREATE POLICY "projeto_membros_admin"
  ON public.projeto_membros
  FOR ALL
  TO authenticated
  USING (private.meu_role() = 'admin'::user_role)
  WITH CHECK (private.meu_role() = 'admin'::user_role);

DROP FUNCTION IF EXISTS public.admin_definir_membros_projeto(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.admin_definir_membros_projeto(uuid, text[]);

CREATE OR REPLACE FUNCTION public.admin_definir_membros_projeto(
  p_projeto_id uuid,
  p_membros text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw text;
  v_uid uuid;
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  IF p_membros IS NULL OR cardinality(p_membros) < 1 THEN
    RAISE EXCEPTION 'Inclua pelo menos uma pessoa no projeto';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.projetos WHERE id = p_projeto_id) THEN
    RAISE EXCEPTION 'Projeto não encontrado';
  END IF;

  DELETE FROM public.projeto_membros WHERE projeto_id = p_projeto_id;

  FOREACH v_raw IN ARRAY p_membros
  LOOP
    IF v_raw IS NULL OR trim(v_raw) = '' THEN
      CONTINUE;
    END IF;
    v_uid := trim(v_raw)::uuid;
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = v_uid AND u.ativo = true
    ) THEN
      RAISE EXCEPTION 'Membro inválido ou inativo';
    END IF;
    INSERT INTO public.projeto_membros (projeto_id, usuario_id)
    VALUES (p_projeto_id, v_uid)
    ON CONFLICT DO NOTHING;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM public.projeto_membros WHERE projeto_id = p_projeto_id
  ) THEN
    RAISE EXCEPTION 'Inclua pelo menos uma pessoa no projeto';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_definir_membros_projeto(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_definir_membros_projeto(uuid, text[])
  TO authenticated;

NOTIFY pgrst, 'reload schema';
