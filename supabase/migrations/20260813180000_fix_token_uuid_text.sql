-- token_acompanhamento é uuid; as RPCs recebiam text → "operator does not exist: uuid = text".

CREATE OR REPLACE FUNCTION public.confirmar_finalizacao(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem public.demandas%ROWTYPE;
BEGIN
  SELECT * INTO v_dem
  FROM public.demandas
  WHERE token_acompanhamento::text = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada';
  END IF;

  IF v_dem.status <> 'aguardando_validacao' THEN
    RAISE EXCEPTION 'Esta demanda não está aguardando validação';
  END IF;

  UPDATE public.demandas
  SET
    status = 'concluida',
    concluido_em = COALESCE(concluido_em, now())
  WHERE id = v_dem.id;

  INSERT INTO public.demanda_historico (
    demanda_id, status_anterior, status_novo, observacao
  ) VALUES (
    v_dem.id,
    'aguardando_validacao',
    'concluida',
    'Solicitante confirmou a finalização'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.contestar_finalizacao(
  p_token text,
  p_descricao text,
  p_foto_url text DEFAULT NULL
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
  IF p_descricao IS NULL OR trim(p_descricao) = '' THEN
    RAISE EXCEPTION 'Descreva o que falta ou o problema';
  END IF;

  SELECT * INTO v_dem
  FROM public.demandas
  WHERE token_acompanhamento::text = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada';
  END IF;

  IF v_dem.status <> 'aguardando_validacao' THEN
    RAISE EXCEPTION 'Esta demanda não está aguardando validação';
  END IF;

  IF v_dem.colaborador_id IS NULL THEN
    RAISE EXCEPTION 'Demanda sem colaborador responsável';
  END IF;

  v_obs := 'Contestação do solicitante: ' || trim(p_descricao);

  UPDATE public.demandas
  SET
    status = 'atribuida',
    concluido_em = NULL,
    iniciado_em = NULL,
    motivo_nao_conclusao = NULL
  WHERE id = v_dem.id;

  IF p_foto_url IS NOT NULL AND trim(p_foto_url) <> '' THEN
    INSERT INTO public.demanda_anexos (demanda_id, url, tipo, enviado_por)
    VALUES (v_dem.id, trim(p_foto_url), 'foto', 'solicitante');
  END IF;

  INSERT INTO public.demanda_historico (
    demanda_id, status_anterior, status_novo, observacao
  ) VALUES (
    v_dem.id,
    'aguardando_validacao',
    'atribuida',
    v_obs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_finalizacao(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contestar_finalizacao(text, text, text) TO anon, authenticated;
