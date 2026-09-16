-- Líder vê todas as demandas de projeto (não precisa ser membro).
-- Membro de projeto: só colaborador ativo. Admin continua o único que cria.

DROP POLICY IF EXISTS "dem_sel_staff" ON public.demandas;
CREATE POLICY "dem_sel_staff"
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (
    private.meu_role() IN ('admin'::user_role, 'lider'::user_role)
    OR colaborador_id = auth.uid()
  );

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
        AND u.role = 'colaborador'::user_role
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

CREATE OR REPLACE FUNCTION public.admin_criar_projeto(
  p_nome text,
  p_descricao text,
  p_propriedade_id uuid,
  p_membros text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_raw text;
  v_uid uuid;
  v_ok integer := 0;
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  IF trim(coalesce(p_nome, '')) = '' THEN
    RAISE EXCEPTION 'Informe o nome do projeto';
  END IF;

  IF p_membros IS NULL OR cardinality(p_membros) < 1 THEN
    RAISE EXCEPTION 'Inclua pelo menos uma pessoa no projeto';
  END IF;

  INSERT INTO public.projetos (nome, descricao, propriedade_id)
  VALUES (
    trim(p_nome),
    NULLIF(trim(coalesce(p_descricao, '')), ''),
    p_propriedade_id
  )
  RETURNING id INTO v_id;

  FOREACH v_raw IN ARRAY p_membros
  LOOP
    IF v_raw IS NULL OR trim(v_raw) = '' THEN
      CONTINUE;
    END IF;
    BEGIN
      v_uid := trim(v_raw)::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Membro inválido ou inativo';
    END;
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = v_uid AND u.ativo = true
        AND u.role = 'colaborador'::user_role
    ) THEN
      RAISE EXCEPTION 'Membro inválido ou inativo';
    END IF;
    INSERT INTO public.projeto_membros (projeto_id, usuario_id)
    VALUES (v_id, v_uid)
    ON CONFLICT DO NOTHING;
    v_ok := v_ok + 1;
  END LOOP;

  IF v_ok < 1 THEN
    RAISE EXCEPTION 'Inclua pelo menos uma pessoa no projeto';
  END IF;

  RETURN v_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
