-- Aviso de chamado novo passa a ser opcional: lista vazia grava "nenhum aviso".
-- Precisa de 20261020160000_avisos_equipe.sql.

CREATE OR REPLACE FUNCTION public.admin_definir_avisos(
  p_user_id uuid,
  p_avisos text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avisos public.ambiente_equipe[];
  v_ambientes public.ambiente_equipe[];
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  IF p_avisos IS NULL THEN
    RAISE EXCEPTION 'Aviso inválido';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_avisos) AS a
    WHERE a IS NULL OR a NOT IN ('manutencao', 'ti')
  ) THEN
    RAISE EXCEPTION 'Aviso inválido';
  END IF;

  SELECT ambientes
  INTO v_ambientes
  FROM public.usuarios
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT a::public.ambiente_equipe), '{}')
  INTO v_avisos
  FROM unnest(p_avisos) AS a;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_avisos) AS aviso
    WHERE NOT (aviso = ANY (v_ambientes))
  ) THEN
    RAISE EXCEPTION 'O aviso precisa ser de um painel que a pessoa vê';
  END IF;

  UPDATE public.usuarios
  SET
    avisos = v_avisos,
    atualizado_em = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_definir_avisos(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_definir_avisos(uuid, text[]) TO authenticated;
