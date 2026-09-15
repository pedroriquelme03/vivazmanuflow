-- Aceita qualquer usuário ativo como membro (inclui admin).

CREATE OR REPLACE FUNCTION public.admin_definir_membros_projeto(
  p_projeto_id uuid,
  p_membros uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  FOREACH v_uid IN ARRAY p_membros
  LOOP
    IF v_uid IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = v_uid AND u.ativo = true
    ) THEN
      RAISE EXCEPTION 'Membro inválido ou inativo';
    END IF;
    INSERT INTO public.projeto_membros (projeto_id, usuario_id)
    VALUES (p_projeto_id, v_uid);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_criar_projeto(
  p_nome text,
  p_descricao text,
  p_propriedade_id uuid,
  p_membros uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_uid uuid;
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

  FOREACH v_uid IN ARRAY p_membros
  LOOP
    IF v_uid IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = v_uid AND u.ativo = true
    ) THEN
      RAISE EXCEPTION 'Membro inválido ou inativo';
    END IF;
    INSERT INTO public.projeto_membros (projeto_id, usuario_id)
    VALUES (v_id, v_uid)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_id;
END;
$$;
