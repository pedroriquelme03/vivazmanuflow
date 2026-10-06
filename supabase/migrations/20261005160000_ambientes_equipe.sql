-- Ambiente do usuário (Manutenção, TI ou os dois) e do chamado.
-- Colaborador existente fica só em Manutenção.
-- Admin passa a ter os dois ambientes. Líder fica só na Manutenção.

CREATE TYPE public.ambiente_equipe AS ENUM ('manutencao', 'ti');

ALTER TABLE public.usuarios
  ADD COLUMN ambientes public.ambiente_equipe[] NOT NULL
  DEFAULT ARRAY['manutencao']::public.ambiente_equipe[];

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_ambientes_nao_vazio;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_ambientes_nao_vazio
  CHECK (cardinality(ambientes) >= 1);

ALTER TABLE public.demandas
  ADD COLUMN ambiente public.ambiente_equipe NOT NULL DEFAULT 'manutencao';

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
    RAISE EXCEPTION 'Marque Manutenção, TI ou os dois';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_ambientes) AS a
    WHERE a IS NULL OR a NOT IN ('manutencao', 'ti')
  ) THEN
    RAISE EXCEPTION 'Ambiente inválido';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT a::public.ambiente_equipe), '{}')
  INTO v_ambientes
  FROM unnest(p_ambientes) AS a;

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

UPDATE public.usuarios
SET ambientes = ARRAY['manutencao', 'ti']::public.ambiente_equipe[]
WHERE role = 'admin';
