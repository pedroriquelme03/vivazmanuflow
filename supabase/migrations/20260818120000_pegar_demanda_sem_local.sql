-- Pool "Demandas Gerais" para todos: qualquer colaborador ativo pode pegar
-- qualquer demanda aberta sem responsável, independentemente do local.
-- Remove a restrição de "Esta demanda é de outro local".

CREATE OR REPLACE FUNCTION public.pegar_demanda(p_demanda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user public.usuarios%ROWTYPE;
  v_dem public.demandas%ROWTYPE;
  horas integer;
  v_prazo timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_user
  FROM public.usuarios
  WHERE id = v_uid AND ativo = true AND role = 'colaborador';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Apenas colaboradores ativos podem pegar demandas';
  END IF;

  SELECT * INTO v_dem
  FROM public.demandas
  WHERE id = p_demanda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada';
  END IF;

  IF v_dem.status <> 'aberta' OR v_dem.colaborador_id IS NOT NULL THEN
    RAISE EXCEPTION 'Esta demanda já foi atribuída a outro colaborador';
  END IF;

  SELECT sc.horas_padrao
  INTO horas
  FROM public.sla_config sc
  WHERE sc.prioridade = v_dem.prioridade
    AND (sc.propriedade_id IS NULL OR sc.propriedade_id = v_dem.propriedade_id)
  ORDER BY sc.propriedade_id NULLS LAST
  LIMIT 1;

  IF horas IS NULL THEN
    horas := 24;
  END IF;

  v_prazo := COALESCE(
    v_dem.prazo_confirmado,
    now() + make_interval(hours => horas)
  );

  UPDATE public.demandas
  SET
    colaborador_id = v_uid,
    status = 'atribuida',
    atribuido_em = now(),
    prazo_confirmado = v_prazo,
    prazo_sugerido = COALESCE(prazo_sugerido, v_prazo)
  WHERE id = p_demanda_id
    AND status = 'aberta'
    AND colaborador_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta demanda já foi atribuída a outro colaborador';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pegar_demanda(uuid) TO authenticated;
