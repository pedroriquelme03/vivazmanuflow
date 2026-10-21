-- "Registrar concluído" aceita PDF além de foto e vídeo.
-- Precisa de 20261021140000_anexo_documento_tipo.sql.

-- Se o bucket limita os tipos de arquivo, o PDF entra na lista.
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
WHERE id = 'anexos'
  AND allowed_mime_types IS NOT NULL
  AND NOT ('application/pdf' = ANY (allowed_mime_types));

CREATE OR REPLACE FUNCTION public.registrar_chamado_concluido(
  p_solicitante_id uuid,
  p_titulo text,
  p_sublocal text,
  p_descricao text DEFAULT NULL,
  p_prioridade public.demanda_prioridade DEFAULT 'media',
  p_ambiente public.ambiente_equipe DEFAULT 'ti',
  p_anexos jsonb DEFAULT '[]'::jsonb,
  p_observacao text DEFAULT NULL,
  p_sistema_id uuid DEFAULT NULL
)
RETURNS TABLE (demanda_id uuid, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prop uuid;
  v_id uuid;
  v_token text;
  v_obs text;
BEGIN
  IF private.meu_role() NOT IN ('admin'::user_role, 'lider'::user_role) THEN
    RAISE EXCEPTION 'Apenas gestor pode registrar já concluído';
  END IF;

  IF p_titulo IS NULL OR trim(p_titulo) = '' THEN
    RAISE EXCEPTION 'Descreva o que precisa ser feito';
  END IF;

  IF p_sistema_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sistemas s
      WHERE s.id = p_sistema_id AND s.ativo
    ) THEN
      RAISE EXCEPTION 'Sistema inválido';
    END IF;
  ELSIF p_sublocal IS NULL OR trim(p_sublocal) = '' THEN
    RAISE EXCEPTION 'Informe o local';
  END IF;

  SELECT propriedade_id INTO v_prop
  FROM public.solicitantes
  WHERE id = p_solicitante_id AND ativo = true;

  IF v_prop IS NULL THEN
    RAISE EXCEPTION 'Solicitante inválido';
  END IF;

  v_obs := nullif(trim(COALESCE(p_observacao, p_descricao, '')), '');
  IF v_obs IS NULL THEN
    RAISE EXCEPTION 'Descreva o que foi feito';
  END IF;

  INSERT INTO public.demandas (
    solicitante_id,
    propriedade_id,
    titulo,
    descricao,
    prioridade,
    status,
    ambiente,
    colaborador_id,
    atribuido_em,
    concluido_em,
    sublocal,
    sistema_id
  ) VALUES (
    p_solicitante_id,
    v_prop,
    trim(p_titulo),
    nullif(trim(COALESCE(p_descricao, '')), ''),
    COALESCE(p_prioridade, 'media'::public.demanda_prioridade),
    'concluida'::public.demanda_status,
    COALESCE(p_ambiente, 'ti'::public.ambiente_equipe),
    auth.uid(),
    now(),
    now(),
    CASE
      WHEN p_sistema_id IS NULL THEN trim(p_sublocal)
      ELSE NULL
    END,
    p_sistema_id
  )
  RETURNING id, token_acompanhamento::text
  INTO v_id, v_token;

  INSERT INTO public.demanda_historico (
    demanda_id, status_anterior, status_novo, observacao, usuario_id
  ) VALUES (
    v_id,
    NULL,
    'concluida',
    'Registrado já concluído: ' || left(v_obs, 500),
    auth.uid()
  );

  INSERT INTO public.demanda_anexos (demanda_id, url, tipo, enviado_por)
  SELECT
    v_id,
    x.url,
    CASE x.tipo
      WHEN 'video' THEN 'video'::public.anexo_tipo
      WHEN 'documento' THEN 'documento'::public.anexo_tipo
      ELSE 'foto'::public.anexo_tipo
    END,
    'solicitante'::public.anexo_autor
  FROM jsonb_to_recordset(COALESCE(p_anexos, '[]'::jsonb))
    AS x(url text, tipo text)
  WHERE x.url IS NOT NULL AND trim(x.url) <> '';

  demanda_id := v_id;
  token := v_token;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_chamado_concluido(
  uuid, text, text, text, public.demanda_prioridade,
  public.ambiente_equipe, jsonb, text, uuid
) TO authenticated;
