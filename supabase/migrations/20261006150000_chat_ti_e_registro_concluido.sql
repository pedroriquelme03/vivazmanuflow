-- Chat do chamado de TI (token + equipe), fechamento pelo solicitante
-- e registro direto em concluído no kanban (sem entrar na fila).

CREATE TABLE IF NOT EXISTS public.demanda_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas (id) ON DELETE CASCADE,
  autor text NOT NULL CHECK (autor IN ('solicitante', 'equipe')),
  autor_id uuid REFERENCES public.usuarios (id),
  autor_nome text NOT NULL,
  texto text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demanda_mensagens_demanda_idx
  ON public.demanda_mensagens (demanda_id, criado_em);

ALTER TABLE public.demanda_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_sel_via_demanda" ON public.demanda_mensagens;
CREATE POLICY "msg_sel_via_demanda"
  ON public.demanda_mensagens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.demandas d
      WHERE d.id = demanda_mensagens.demanda_id
    )
  );

GRANT SELECT ON public.demanda_mensagens TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.demanda_mensagens;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Não joga na fila o que já nasce concluído / cancelado.
CREATE OR REPLACE FUNCTION public.trg_demanda_predefinida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pred public.demandas_predefinidas%ROWTYPE;
  horas integer;
BEGIN
  IF NEW.status IN (
    'concluida'::public.demanda_status,
    'cancelada'::public.demanda_status
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.colaborador_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO pred
  FROM public.demandas_predefinidas
  WHERE ativo = true
    AND lower(trim(titulo)) = lower(trim(NEW.titulo))
    AND (propriedade_id IS NULL OR propriedade_id = NEW.propriedade_id)
  ORDER BY propriedade_id NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  NEW.colaborador_id := pred.colaborador_id;
  NEW.prioridade := pred.prioridade;
  NEW.status := 'atribuida'::public.demanda_status;
  NEW.atribuido_em := COALESCE(NEW.atribuido_em, now());

  SELECT sc.horas_padrao
  INTO horas
  FROM public.sla_config sc
  WHERE sc.prioridade = NEW.prioridade
    AND (sc.propriedade_id IS NULL OR sc.propriedade_id = NEW.propriedade_id)
  ORDER BY sc.propriedade_id NULLS LAST
  LIMIT 1;

  IF horas IS NULL THEN
    horas := 24;
  END IF;

  IF NEW.prazo_confirmado IS NULL THEN
    NEW.prazo_confirmado := now() + make_interval(hours => horas);
  END IF;
  IF NEW.prazo_sugerido IS NULL THEN
    NEW.prazo_sugerido := NEW.prazo_confirmado;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_demanda_atribuir_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colab uuid;
  horas integer;
BEGIN
  IF NEW.status IN (
    'concluida'::public.demanda_status,
    'cancelada'::public.demanda_status
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.colaborador_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_colab := public.colaborador_menos_demandas(NEW.propriedade_id);
  IF v_colab IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.colaborador_id := v_colab;
  NEW.status := 'atribuida'::public.demanda_status;
  NEW.atribuido_em := COALESCE(NEW.atribuido_em, now());

  SELECT sc.horas_padrao
  INTO horas
  FROM public.sla_config sc
  WHERE sc.prioridade = NEW.prioridade
    AND (sc.propriedade_id IS NULL OR sc.propriedade_id = NEW.propriedade_id)
  ORDER BY sc.propriedade_id NULLS LAST
  LIMIT 1;

  IF horas IS NULL THEN
    horas := 24;
  END IF;

  IF NEW.prazo_confirmado IS NULL THEN
    NEW.prazo_confirmado := now() + make_interval(hours => horas);
  END IF;
  IF NEW.prazo_sugerido IS NULL THEN
    NEW.prazo_sugerido := NEW.prazo_confirmado;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_mensagens_chamado(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem public.demandas%ROWTYPE;
BEGIN
  SELECT * INTO v_dem
  FROM public.demandas
  WHERE token_acompanhamento::text = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  RETURN jsonb_build_object(
    'ambiente', v_dem.ambiente,
    'status', v_dem.status,
    'mensagens', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'autor', m.autor,
        'autor_nome', m.autor_nome,
        'texto', m.texto,
        'criado_em', m.criado_em
      ) ORDER BY m.criado_em)
      FROM public.demanda_mensagens m
      WHERE m.demanda_id = v_dem.id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enviar_mensagem_chamado(
  p_token text,
  p_texto text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem public.demandas%ROWTYPE;
  v_nome text;
BEGIN
  IF p_texto IS NULL OR trim(p_texto) = '' THEN
    RAISE EXCEPTION 'Escreva a mensagem';
  END IF;

  SELECT * INTO v_dem
  FROM public.demandas
  WHERE token_acompanhamento::text = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  IF v_dem.ambiente IS DISTINCT FROM 'ti'::public.ambiente_equipe THEN
    RAISE EXCEPTION 'Mensagens só no chamado de TI';
  END IF;

  IF v_dem.status = 'cancelada'::public.demanda_status THEN
    RAISE EXCEPTION 'Este chamado foi cancelado';
  END IF;

  SELECT s.nome INTO v_nome
  FROM public.solicitantes s
  WHERE s.id = v_dem.solicitante_id;

  INSERT INTO public.demanda_mensagens (
    demanda_id, autor, autor_id, autor_nome, texto
  ) VALUES (
    v_dem.id,
    'solicitante',
    auth.uid(),
    COALESCE(nullif(trim(v_nome), ''), 'Solicitante'),
    left(trim(p_texto), 2000)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.equipe_enviar_mensagem(
  p_demanda_id uuid,
  p_texto text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem public.demandas%ROWTYPE;
  v_user public.usuarios%ROWTYPE;
BEGIN
  IF p_texto IS NULL OR trim(p_texto) = '' THEN
    RAISE EXCEPTION 'Escreva a mensagem';
  END IF;

  SELECT * INTO v_user
  FROM public.usuarios
  WHERE id = auth.uid() AND ativo = true;

  IF NOT FOUND OR v_user.role NOT IN (
    'admin'::user_role,
    'lider'::user_role,
    'colaborador'::user_role
  ) THEN
    RAISE EXCEPTION 'Sem permissão para responder';
  END IF;

  SELECT * INTO v_dem
  FROM public.demandas
  WHERE id = p_demanda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  IF v_dem.ambiente IS DISTINCT FROM 'ti'::public.ambiente_equipe THEN
    RAISE EXCEPTION 'Mensagens só no chamado de TI';
  END IF;

  INSERT INTO public.demanda_mensagens (
    demanda_id, autor, autor_id, autor_nome, texto
  ) VALUES (
    v_dem.id,
    'equipe',
    v_user.id,
    v_user.nome,
    left(trim(p_texto), 2000)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.solicitante_fechar_chamado(
  p_token text,
  p_resolvido boolean,
  p_descricao text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem public.demandas%ROWTYPE;
  v_nome text;
  v_texto text;
BEGIN
  IF p_resolvido IS NULL THEN
    RAISE EXCEPTION 'Informe se foi resolvido';
  END IF;
  IF p_descricao IS NULL OR trim(p_descricao) = '' THEN
    RAISE EXCEPTION 'Descreva o que aconteceu';
  END IF;

  SELECT * INTO v_dem
  FROM public.demandas
  WHERE token_acompanhamento::text = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  IF v_dem.ambiente IS DISTINCT FROM 'ti'::public.ambiente_equipe THEN
    RAISE EXCEPTION 'Fechamento pelo solicitante só no chamado de TI';
  END IF;

  IF v_dem.status IN (
    'concluida'::public.demanda_status,
    'cancelada'::public.demanda_status
  ) THEN
    RAISE EXCEPTION 'Este chamado já foi encerrado';
  END IF;

  SELECT s.nome INTO v_nome
  FROM public.solicitantes s
  WHERE s.id = v_dem.solicitante_id;

  v_texto := left(trim(p_descricao), 2000);

  INSERT INTO public.demanda_mensagens (
    demanda_id, autor, autor_id, autor_nome, texto
  ) VALUES (
    v_dem.id,
    'solicitante',
    auth.uid(),
    COALESCE(nullif(trim(v_nome), ''), 'Solicitante'),
    CASE
      WHEN p_resolvido THEN 'Resolvido: ' || v_texto
      ELSE 'Ainda não resolvido: ' || v_texto
    END
  );

  IF p_resolvido THEN
    UPDATE public.demandas
    SET
      status = 'concluida'::public.demanda_status,
      concluido_em = COALESCE(concluido_em, now())
    WHERE id = v_dem.id;

    INSERT INTO public.demanda_historico (
      demanda_id, status_anterior, status_novo, observacao
    ) VALUES (
      v_dem.id,
      v_dem.status,
      'concluida',
      'Solicitante confirmou: ' || v_texto
    );
  ELSIF v_dem.status = 'aguardando_validacao'::public.demanda_status THEN
    UPDATE public.demandas
    SET
      status = CASE
        WHEN v_dem.colaborador_id IS NULL THEN 'aberta'::public.demanda_status
        ELSE 'atribuida'::public.demanda_status
      END,
      concluido_em = NULL
    WHERE id = v_dem.id;

    INSERT INTO public.demanda_historico (
      demanda_id, status_anterior, status_novo, observacao
    ) VALUES (
      v_dem.id,
      'aguardando_validacao',
      CASE
        WHEN v_dem.colaborador_id IS NULL THEN 'aberta'::public.demanda_status
        ELSE 'atribuida'::public.demanda_status
      END,
      'Solicitante: ainda não resolvido. ' || v_texto
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_chamado_concluido(
  p_solicitante_id uuid,
  p_titulo text,
  p_sublocal text,
  p_descricao text DEFAULT NULL,
  p_prioridade public.demanda_prioridade DEFAULT 'media',
  p_ambiente public.ambiente_equipe DEFAULT 'ti',
  p_anexos jsonb DEFAULT '[]'::jsonb,
  p_observacao text DEFAULT NULL
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
  IF p_sublocal IS NULL OR trim(p_sublocal) = '' THEN
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
    sublocal
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
    trim(p_sublocal)
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
    CASE WHEN x.tipo = 'video' THEN 'video'::public.anexo_tipo
         ELSE 'foto'::public.anexo_tipo END,
    'solicitante'::public.anexo_autor
  FROM jsonb_to_recordset(COALESCE(p_anexos, '[]'::jsonb))
    AS x(url text, tipo text)
  WHERE x.url IS NOT NULL AND trim(x.url) <> '';

  demanda_id := v_id;
  token := v_token;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_mensagens_chamado(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enviar_mensagem_chamado(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.equipe_enviar_mensagem(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.solicitante_fechar_chamado(text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_chamado_concluido(
  uuid, text, text, text, public.demanda_prioridade, public.ambiente_equipe, jsonb, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.listar_mensagens_chamado(text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_mensagem_chamado(text, text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.solicitante_fechar_chamado(text, boolean, text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.equipe_enviar_mensagem(uuid, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_chamado_concluido(
  uuid, text, text, text, public.demanda_prioridade, public.ambiente_equipe, jsonb, text
) TO authenticated;
