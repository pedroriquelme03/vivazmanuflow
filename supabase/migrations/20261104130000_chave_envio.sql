-- Fila offline: o celular gera uma chave por chamado e reenvia quando a
-- internet volta. Com sinal ruim o chamado pode ter sido criado e a resposta
-- não chegar; com a chave, o reenvio devolve o mesmo chamado em vez de
-- criar outro.

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS chave_envio text;

CREATE UNIQUE INDEX IF NOT EXISTS demandas_chave_envio_key
  ON public.demandas (chave_envio)
  WHERE chave_envio IS NOT NULL;

CREATE OR REPLACE FUNCTION public.abrir_demanda_com_chave(
  p_chave text,
  p_solicitante_id uuid,
  p_titulo text,
  p_descricao text DEFAULT NULL,
  p_prioridade public.demanda_prioridade DEFAULT 'media',
  p_anexos jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (demanda_id uuid, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_token text;
BEGIN
  IF p_chave IS NULL OR trim(p_chave) = '' OR length(p_chave) > 100 THEN
    RAISE EXCEPTION 'Chave de envio inválida';
  END IF;

  -- Dois reenvios ao mesmo tempo com a mesma chave esperam um pelo outro.
  PERFORM pg_advisory_xact_lock(hashtext('abrir_demanda_com_chave:' || p_chave));

  SELECT d.id, d.token_acompanhamento::text
    INTO v_id, v_token
  FROM public.demandas d
  WHERE d.chave_envio = p_chave;

  IF v_id IS NULL THEN
    SELECT a.demanda_id, a.token::text
      INTO v_id, v_token
    FROM public.abrir_demanda(
      p_solicitante_id => p_solicitante_id,
      p_titulo => p_titulo,
      p_descricao => p_descricao,
      p_prioridade => p_prioridade,
      p_anexos => p_anexos
    ) a;

    UPDATE public.demandas SET chave_envio = p_chave WHERE id = v_id;
  END IF;

  demanda_id := v_id;
  token := v_token;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.abrir_demanda_com_chave(
  text, uuid, text, text, public.demanda_prioridade, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abrir_demanda_com_chave(
  text, uuid, text, text, public.demanda_prioridade, jsonb
) TO authenticated;
