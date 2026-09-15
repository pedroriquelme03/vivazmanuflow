-- Lista projetos no formulário mesmo se o cache/RLS da tabela falhar.
-- Também reabre a leitura de projetos ativos e não exige o mesmo local na vinculação.

DROP POLICY IF EXISTS "projetos_select_ativos" ON public.projetos;
CREATE POLICY "projetos_select_ativos"
  ON public.projetos
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

CREATE OR REPLACE FUNCTION public.listar_projetos_ativos()
RETURNS TABLE (id uuid, nome text, propriedade_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nome, p.propriedade_id
  FROM public.projetos p
  WHERE p.ativo = true
  ORDER BY p.nome;
$$;

REVOKE ALL ON FUNCTION public.listar_projetos_ativos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_projetos_ativos() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.vincular_projeto_demanda(
  p_token text,
  p_projeto_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem public.demandas%ROWTYPE;
  v_pr public.projetos%ROWTYPE;
BEGIN
  SELECT * INTO v_dem
  FROM public.demandas
  WHERE token_acompanhamento::text = p_token
    AND criado_em > now() - interval '15 minutes'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada ou expirada';
  END IF;

  SELECT * INTO v_pr
  FROM public.projetos
  WHERE id = p_projeto_id AND ativo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto inválido ou inativo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projeto_membros WHERE projeto_id = p_projeto_id
  ) THEN
    RAISE EXCEPTION 'Projeto sem membros';
  END IF;

  UPDATE public.demandas
  SET projeto_id = p_projeto_id
  WHERE id = v_dem.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vincular_projeto_demanda(text, uuid)
  TO anon, authenticated;
