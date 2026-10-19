-- O mesmo erro, na mesma hora, abre um chamado só.
-- Se voltar depois de uma hora, abre outro, também um só.

CREATE OR REPLACE FUNCTION public.aplicar_alerta_sentry(
  p_slug text,
  p_issue_id text,
  p_nivel text,
  p_ambiente text,
  p_descricao text,
  p_rota text,
  p_quadro text,
  p_ocorrencias integer,
  p_usuarios integer,
  p_primeira timestamptz,
  p_ultima timestamptz,
  p_sentry_url text,
  p_posthog_url text,
  p_prioridade public.demanda_prioridade,
  p_afeta boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acao text;
  v_detalhe text;
  v_slug text;
  v_issue text;
  v_sistema_id uuid;
  v_nome text;
  v_ativo boolean;
  v_id uuid;
  v_status public.demanda_status;
  v_arquivado boolean;
  v_usuarios integer;
  v_prioridade public.demanda_prioridade;
  v_afeta boolean;
  v_rota text;
  v_quadro text;
  v_sentry_url text;
  v_posthog_url text;
  v_prop uuid;
  v_sol uuid;
  v_titulo text;
  v_erro text;
  v_aberta boolean;
BEGIN
  v_slug := lower(trim(coalesce(p_slug, '')));
  v_issue := left(trim(coalesce(p_issue_id, '')), 64);
  v_usuarios := LEAST(GREATEST(coalesce(p_usuarios, 0), 0), 1000000);
  v_rota := nullif(left(trim(coalesce(p_rota, '')), 200), '');
  v_quadro := CASE
    WHEN p_quadro IN ('ti', 'manutencao') THEN p_quadro
    ELSE NULL
  END;
  v_sentry_url := CASE
    WHEN coalesce(p_sentry_url, '') ~ '^https://' THEN left(p_sentry_url, 300)
    ELSE NULL
  END;
  v_posthog_url := CASE
    WHEN coalesce(p_posthog_url, '') ~ '^https://' THEN left(p_posthog_url, 300)
    ELSE NULL
  END;

  IF v_issue = '' OR v_issue !~ '^[A-Za-z0-9_-]+$' THEN
    v_acao := 'ignorado';
    v_detalhe := 'payload sem issue';
  ELSIF lower(trim(coalesce(p_ambiente, ''))) <> 'production' THEN
    v_acao := 'ignorado';
    v_detalhe := 'fora de producao';
  ELSIF lower(trim(coalesce(p_nivel, ''))) NOT IN ('fatal', 'error') THEN
    v_acao := 'ignorado';
    v_detalhe := 'nivel ignorado';
  ELSIF v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    v_acao := 'ignorado';
    v_detalhe := 'slug desconhecido';
  ELSE
    SELECT s.id, s.nome, s.ativo
    INTO v_sistema_id, v_nome, v_ativo
    FROM public.sistemas s
    WHERE lower(trim(s.slug)) = v_slug
    LIMIT 1;

    IF v_sistema_id IS NULL THEN
      v_acao := 'ignorado';
      v_detalhe := 'slug desconhecido';
    ELSIF NOT v_ativo THEN
      v_acao := 'ignorado';
      v_detalhe := 'sistema inativo';
    END IF;
  END IF;

  IF v_acao = 'ignorado' THEN
    INSERT INTO public.sentry_alertas_log (slug, issue_id, acao, detalhe)
    VALUES (nullif(v_slug, ''), nullif(v_issue, ''), v_acao, v_detalhe);
    RETURN v_acao;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('sentry-chamado:' || v_issue));

  SELECT d.id, d.status, d.arquivado
  INTO v_id, v_status, v_arquivado
  FROM public.demandas d
  WHERE d.sentry_issue_id = v_issue
    AND d.criado_em >= now() - interval '1 hour'
  ORDER BY d.criado_em DESC
  LIMIT 1
  FOR UPDATE;

  v_aberta := v_id IS NOT NULL
    AND NOT coalesce(v_arquivado, false)
    AND v_status IN (
      'aberta'::public.demanda_status,
      'atribuida'::public.demanda_status,
      'em_andamento'::public.demanda_status,
      'aguardando_validacao'::public.demanda_status
    );

  IF v_id IS NOT NULL AND v_aberta THEN
    UPDATE public.demandas
    SET
      sentry_ocorrencias = coalesce(sentry_ocorrencias, 1) + 1,
      sentry_usuarios = GREATEST(coalesce(sentry_usuarios, 0), v_usuarios),
      sentry_ultima_em = coalesce(p_ultima, now()),
      sentry_rota = coalesce(v_rota, sentry_rota),
      sentry_quadro = coalesce(v_quadro, sentry_quadro),
      sentry_url = coalesce(v_sentry_url, sentry_url),
      sentry_posthog_url = coalesce(v_posthog_url, sentry_posthog_url)
    WHERE id = v_id;

    INSERT INTO public.sentry_alertas_log (slug, issue_id, acao, detalhe)
    VALUES (v_slug, v_issue, 'atualizado', 'mesma hora');
    RETURN 'atualizado';
  END IF;

  IF v_id IS NOT NULL THEN
    INSERT INTO public.sentry_alertas_log (slug, issue_id, acao, detalhe)
    VALUES (v_slug, v_issue, 'ignorado', 'ja registrado nesta hora');
    RETURN 'ignorado';
  END IF;

  SELECT p.id INTO v_prop
  FROM public.propriedades p
  WHERE p.ativo
  ORDER BY p.criado_em
  LIMIT 1;

  IF v_prop IS NULL THEN
    SELECT p.id INTO v_prop
    FROM public.propriedades p
    ORDER BY p.criado_em
    LIMIT 1;
  END IF;

  IF v_prop IS NULL THEN
    INSERT INTO public.sentry_alertas_log (slug, issue_id, acao, detalhe)
    VALUES (v_slug, v_issue, 'ignorado', 'sem propriedade');
    RETURN 'ignorado';
  END IF;

  SELECT s.id INTO v_sol
  FROM public.solicitantes s
  WHERE s.propriedade_id = v_prop
    AND lower(trim(s.nome)) = 'sentry'
    AND s.ativo = true
  ORDER BY s.criado_em
  LIMIT 1;

  IF v_sol IS NULL THEN
    INSERT INTO public.solicitantes (nome, propriedade_id, ativo, setor_id)
    VALUES ('Sentry', v_prop, true, NULL)
    RETURNING id INTO v_sol;
  END IF;

  v_prioridade := 'alta'::public.demanda_prioridade;
  v_afeta := true;
  v_erro := nullif(
    regexp_replace(
      left(trim(split_part(coalesce(p_descricao, ''), E'\n', 1)), 100),
      '^Erro:\s*',
      ''
    ),
    ''
  );
  v_titulo := left(
    CASE
      WHEN v_erro IS NULL OR v_erro = 'Erro identificado automaticamente'
        THEN 'Corrigir erro identificado automaticamente no ' || trim(v_nome)
      ELSE trim(v_nome) || ': ' || v_erro
    END,
    140
  );

  INSERT INTO public.demandas (
    solicitante_id,
    propriedade_id,
    titulo,
    descricao,
    prioridade,
    status,
    ambiente,
    colaborador_id,
    sublocal,
    sistema_id,
    afeta_experiencia,
    sentry_issue_id,
    sentry_ocorrencias,
    sentry_usuarios,
    sentry_primeira_em,
    sentry_ultima_em,
    sentry_rota,
    sentry_quadro,
    sentry_url,
    sentry_posthog_url
  ) VALUES (
    v_sol,
    v_prop,
    v_titulo,
    nullif(left(coalesce(p_descricao, ''), 2000), ''),
    v_prioridade,
    'aberta'::public.demanda_status,
    'ti'::public.ambiente_equipe,
    NULL,
    NULL,
    v_sistema_id,
    v_afeta,
    v_issue,
    1,
    v_usuarios,
    coalesce(p_primeira, now()),
    coalesce(p_ultima, now()),
    v_rota,
    v_quadro,
    v_sentry_url,
    v_posthog_url
  )
  RETURNING id INTO v_id;

  INSERT INTO public.demanda_historico (
    demanda_id, status_anterior, status_novo, observacao
  ) VALUES (
    v_id, NULL, 'aberta', 'Aberto automaticamente pelo Sentry'
  );

  INSERT INTO public.sentry_alertas_log (slug, issue_id, acao, detalhe)
  VALUES (v_slug, v_issue, 'criado', NULL);
  RETURN 'criado';
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_alerta_sentry(
  text, text, text, text, text, text, text, integer, integer,
  timestamptz, timestamptz, text, text, public.demanda_prioridade, boolean
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.aplicar_alerta_sentry(
  text, text, text, text, text, text, text, integer, integer,
  timestamptz, timestamptz, text, text, public.demanda_prioridade, boolean
) FROM anon;

REVOKE ALL ON FUNCTION public.aplicar_alerta_sentry(
  text, text, text, text, text, text, text, integer, integer,
  timestamptz, timestamptz, text, text, public.demanda_prioridade, boolean
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.aplicar_alerta_sentry(
  text, text, text, text, text, text, text, integer, integer,
  timestamptz, timestamptz, text, text, public.demanda_prioridade, boolean
) TO service_role;
