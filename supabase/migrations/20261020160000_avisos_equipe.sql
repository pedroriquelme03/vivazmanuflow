-- Escolha de qual equipe manda aviso de chamado novo.
-- Quem vê os dois painéis pode receber só de um.
-- Admin e líder que já estão nos dois passam a receber só Manutenção.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS avisos public.ambiente_equipe[];

UPDATE public.usuarios
SET avisos = ARRAY['manutencao']::public.ambiente_equipe[]
WHERE role IN ('admin', 'lider')
  AND 'manutencao' = ANY (ambientes)
  AND 'ti' = ANY (ambientes)
  AND avisos IS NULL;

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

  IF p_avisos IS NULL OR cardinality(p_avisos) < 1 THEN
    RAISE EXCEPTION 'Marque o aviso de Manutenção, de TI ou dos dois';
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
