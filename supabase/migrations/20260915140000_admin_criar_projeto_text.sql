-- Criar projeto com 2+ pessoas: PostgREST manda text[], não uuid[].

DROP FUNCTION IF EXISTS public.admin_criar_projeto(text, text, uuid, uuid[]);
DROP FUNCTION IF EXISTS public.admin_criar_projeto(text, text, uuid, text[]);

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

REVOKE ALL ON FUNCTION public.admin_criar_projeto(text, text, uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_criar_projeto(text, text, uuid, text[])
  TO authenticated;

NOTIFY pgrst, 'reload schema';
