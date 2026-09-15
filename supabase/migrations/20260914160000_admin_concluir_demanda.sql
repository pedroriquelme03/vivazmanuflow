-- Admin conclui demanda aberta, atribuída ou em andamento, com motivo obrigatório.

CREATE OR REPLACE FUNCTION public.admin_concluir_demanda(
  p_id uuid,
  p_observacao text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem public.demandas%ROWTYPE;
  v_obs text;
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  v_obs := trim(coalesce(p_observacao, ''));
  IF v_obs = '' THEN
    RAISE EXCEPTION 'Informe o motivo da conclusão';
  END IF;

  SELECT * INTO v_dem
  FROM public.demandas
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada';
  END IF;

  IF v_dem.arquivado THEN
    RAISE EXCEPTION 'Desarquive a demanda antes de concluir';
  END IF;

  IF v_dem.status NOT IN (
    'aberta'::public.demanda_status,
    'atribuida'::public.demanda_status,
    'em_andamento'::public.demanda_status
  ) THEN
    RAISE EXCEPTION 'Só é possível concluir demandas abertas, atribuídas ou em andamento';
  END IF;

  UPDATE public.demandas
  SET
    status = 'concluida'::public.demanda_status,
    concluido_em = now()
  WHERE id = p_id;

  INSERT INTO public.demanda_historico (
    demanda_id, status_anterior, status_novo, observacao, usuario_id
  ) VALUES (
    p_id,
    v_dem.status,
    'concluida'::public.demanda_status,
    v_obs,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_concluir_demanda(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_concluir_demanda(uuid, text) TO authenticated;
