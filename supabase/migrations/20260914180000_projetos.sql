-- Projetos: fila restrita a membros + admin. Sem datas.
-- Demandas sem projeto continuam na fila normal.

CREATE TABLE IF NOT EXISTS public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  propriedade_id uuid REFERENCES public.propriedades (id),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projetos_ativo_idx ON public.projetos (ativo);
CREATE INDEX IF NOT EXISTS projetos_prop_idx ON public.projetos (propriedade_id);

CREATE TABLE IF NOT EXISTS public.projeto_membros (
  projeto_id uuid NOT NULL REFERENCES public.projetos (id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  PRIMARY KEY (projeto_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS projeto_membros_usuario_idx
  ON public.projeto_membros (usuario_id);

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.projetos (id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS demandas_projeto_idx ON public.demandas (projeto_id)
  WHERE projeto_id IS NOT NULL;

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_membros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projetos_select_ativos" ON public.projetos;
CREATE POLICY "projetos_select_ativos"
  ON public.projetos
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

DROP POLICY IF EXISTS "projetos_admin_all_select" ON public.projetos;
CREATE POLICY "projetos_admin_all_select"
  ON public.projetos
  FOR SELECT
  TO authenticated
  USING (private.meu_role() = 'admin'::user_role);

DROP POLICY IF EXISTS "projetos_admin_insert" ON public.projetos;
CREATE POLICY "projetos_admin_insert"
  ON public.projetos
  FOR INSERT
  TO authenticated
  WITH CHECK (private.meu_role() = 'admin'::user_role);

DROP POLICY IF EXISTS "projetos_admin_update" ON public.projetos;
CREATE POLICY "projetos_admin_update"
  ON public.projetos
  FOR UPDATE
  TO authenticated
  USING (private.meu_role() = 'admin'::user_role)
  WITH CHECK (private.meu_role() = 'admin'::user_role);

DROP POLICY IF EXISTS "projetos_admin_delete" ON public.projetos;
CREATE POLICY "projetos_admin_delete"
  ON public.projetos
  FOR DELETE
  TO authenticated
  USING (private.meu_role() = 'admin'::user_role);

CREATE OR REPLACE FUNCTION public.projetos_do_usuario(p_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT projeto_id FROM public.projeto_membros WHERE usuario_id = p_uid;
$$;

REVOKE ALL ON FUNCTION public.projetos_do_usuario(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.projetos_do_usuario(uuid) TO authenticated;

DROP POLICY IF EXISTS "projeto_membros_select" ON public.projeto_membros;
CREATE POLICY "projeto_membros_select"
  ON public.projeto_membros
  FOR SELECT
  TO authenticated
  USING (
    private.meu_role() = 'admin'::user_role
    OR usuario_id = auth.uid()
    OR projeto_id IN (SELECT public.projetos_do_usuario(auth.uid()))
  );

DROP POLICY IF EXISTS "projeto_membros_admin" ON public.projeto_membros;
CREATE POLICY "projeto_membros_admin"
  ON public.projeto_membros
  FOR ALL
  TO authenticated
  USING (private.meu_role() = 'admin'::user_role)
  WITH CHECK (private.meu_role() = 'admin'::user_role);

CREATE OR REPLACE FUNCTION public.eh_membro_projeto(p_projeto_id uuid, p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projeto_membros
    WHERE projeto_id = p_projeto_id AND usuario_id = p_uid
  );
$$;

REVOKE ALL ON FUNCTION public.eh_membro_projeto(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eh_membro_projeto(uuid, uuid) TO authenticated;

-- Fila geral: só demandas sem projeto.
DROP POLICY IF EXISTS "dem_sel_pool_colab" ON public.demandas;
CREATE POLICY "dem_sel_pool_colab"
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (
    status = 'aberta'
    AND colaborador_id IS NULL
    AND projeto_id IS NULL
    AND private.meu_role() = 'colaborador'::user_role
  );

DROP POLICY IF EXISTS "dem_sel_pool_projeto" ON public.demandas;
CREATE POLICY "dem_sel_pool_projeto"
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (
    status = 'aberta'
    AND colaborador_id IS NULL
    AND projeto_id IS NOT NULL
    AND private.meu_role() = 'colaborador'::user_role
    AND public.eh_membro_projeto(projeto_id, auth.uid())
  );

-- Gestor: admin vê tudo; líder só fila normal + projetos em que é membro.
DROP POLICY IF EXISTS "dem_sel_staff" ON public.demandas;
CREATE POLICY "dem_sel_staff"
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (
    private.meu_role() = 'admin'::user_role
    OR (
      private.meu_role() = 'lider'::user_role
      AND (
        projeto_id IS NULL
        OR public.eh_membro_projeto(projeto_id, auth.uid())
      )
    )
  );

CREATE OR REPLACE FUNCTION public.admin_criar_projeto(
  p_nome text,
  p_descricao text,
  p_propriedade_id uuid,
  p_membros uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_uid uuid;
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  IF trim(coalesce(p_nome, '')) = '' THEN
    RAISE EXCEPTION 'Informe o nome do projeto';
  END IF;

  IF p_membros IS NULL OR cardinality(p_membros) < 1 THEN
    RAISE EXCEPTION 'Inclua pelo menos uma pessoa no projeto';
  END IF;

  INSERT INTO public.projetos (nome, descricao, propriedade_id)
  VALUES (
    trim(p_nome),
    NULLIF(trim(coalesce(p_descricao, '')), ''),
    p_propriedade_id
  )
  RETURNING id INTO v_id;

  FOREACH v_uid IN ARRAY p_membros
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = v_uid AND u.ativo = true
        AND u.role IN ('colaborador'::user_role, 'lider'::user_role, 'admin'::user_role)
    ) THEN
      RAISE EXCEPTION 'Membro inválido ou inativo';
    END IF;
    INSERT INTO public.projeto_membros (projeto_id, usuario_id)
    VALUES (v_id, v_uid)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_definir_membros_projeto(
  p_projeto_id uuid,
  p_membros uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  IF p_membros IS NULL OR cardinality(p_membros) < 1 THEN
    RAISE EXCEPTION 'Inclua pelo menos uma pessoa no projeto';
  END IF;

  DELETE FROM public.projeto_membros WHERE projeto_id = p_projeto_id;

  FOREACH v_uid IN ARRAY p_membros
  LOOP
    IF v_uid IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = v_uid AND u.ativo = true
    ) THEN
      RAISE EXCEPTION 'Membro inválido ou inativo';
    END IF;
    INSERT INTO public.projeto_membros (projeto_id, usuario_id)
    VALUES (p_projeto_id, v_uid);
  END LOOP;
END;
$$;

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

  IF v_dem.projeto_id IS NOT NULL
     AND NOT public.eh_membro_projeto(v_dem.projeto_id, v_uid) THEN
    RAISE EXCEPTION 'Esta demanda é de um projeto do qual você não faz parte';
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

CREATE OR REPLACE FUNCTION public.demandas_quadro_tv()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(q.item ORDER BY q.peso DESC, q.criado_em ASC),
    '[]'::jsonb
  )
  FROM (
    SELECT
      jsonb_build_object(
        'id', d.id,
        'titulo', d.titulo,
        'descricao', d.descricao,
        'prioridade', d.prioridade,
        'status', d.status,
        'criado_em', d.criado_em,
        'atribuido_em', d.atribuido_em,
        'iniciado_em', d.iniciado_em,
        'concluido_em', d.concluido_em,
        'prazo_confirmado', d.prazo_confirmado,
        'colaborador_id', d.colaborador_id,
        'propriedade_id', d.propriedade_id,
        'motivo_nao_conclusao', d.motivo_nao_conclusao,
        'peso', d.peso,
        'afeta_experiencia', d.afeta_experiencia,
        'evento_id', d.evento_id,
        'arquivado', d.arquivado,
        'sublocal', d.sublocal,
        'solicitante', CASE
          WHEN s.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', s.nome)
        END,
        'local', CASE
          WHEN l.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', l.nome)
        END,
        'propriedade', CASE
          WHEN p.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', p.nome)
        END,
        'colaborador', CASE
          WHEN u.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', u.nome)
        END,
        'evento', CASE
          WHEN e.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', e.nome)
        END,
        'anexos', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'url', a.url,
              'tipo', a.tipo,
              'enviado_por', a.enviado_por,
              'criado_em', a.criado_em
            )
            ORDER BY a.criado_em
          )
          FROM public.demanda_anexos a
          WHERE a.demanda_id = d.id
        ), '[]'::jsonb)
      ) AS item,
      d.peso,
      d.criado_em
    FROM public.demandas d
    LEFT JOIN public.solicitantes s ON s.id = d.solicitante_id
    LEFT JOIN public.locais l ON l.id = d.local_id
    LEFT JOIN public.propriedades p ON p.id = d.propriedade_id
    LEFT JOIN public.usuarios u ON u.id = d.colaborador_id
    LEFT JOIN public.eventos e ON e.id = d.evento_id
    WHERE d.arquivado = false
      AND d.projeto_id IS NULL
      AND d.status IN (
        'aberta',
        'atribuida',
        'em_andamento',
        'aguardando_validacao',
        'concluida'
      )
      AND (
        d.status <> 'concluida'
        OR (
          (d.concluido_em AT TIME ZONE 'America/Sao_Paulo')::date
          = (timezone('America/Sao_Paulo', now()))::date
        )
      )
  ) q;
$$;

GRANT EXECUTE ON FUNCTION public.admin_criar_projeto(text, text, uuid, uuid[])
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_definir_membros_projeto(uuid, uuid[])
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_projeto_demanda(text, uuid)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pegar_demanda(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demandas_quadro_tv() TO anon, authenticated;
