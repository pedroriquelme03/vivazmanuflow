-- Áreas do hotel + equipamentos com código/QR e histórico de manutenção.

CREATE TABLE IF NOT EXISTS public.hotel_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  propriedade_id uuid REFERENCES public.propriedades (id),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hotel_areas_ativo_idx ON public.hotel_areas (ativo);
CREATE INDEX IF NOT EXISTS hotel_areas_prop_idx ON public.hotel_areas (propriedade_id);

CREATE TABLE IF NOT EXISTS public.equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.hotel_areas (id) ON DELETE CASCADE,
  nome text NOT NULL,
  codigo text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipamentos_codigo_unico UNIQUE (codigo)
);

CREATE INDEX IF NOT EXISTS equipamentos_area_idx ON public.equipamentos (area_id);
CREATE INDEX IF NOT EXISTS equipamentos_ativo_idx ON public.equipamentos (ativo);
CREATE INDEX IF NOT EXISTS equipamentos_codigo_idx ON public.equipamentos (codigo);

CREATE OR REPLACE FUNCTION public.normalizar_codigo_equipamento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.codigo := upper(trim(NEW.codigo));
  NEW.codigo := regexp_replace(NEW.codigo, '[^A-Z0-9\-]+', '-', 'g');
  NEW.codigo := regexp_replace(NEW.codigo, '-+', '-', 'g');
  NEW.codigo := trim(both '-' from NEW.codigo);
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    RAISE EXCEPTION 'Código do equipamento inválido';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS equipamentos_normalizar_codigo ON public.equipamentos;
CREATE TRIGGER equipamentos_normalizar_codigo
  BEFORE INSERT OR UPDATE OF codigo ON public.equipamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.normalizar_codigo_equipamento();

CREATE TABLE IF NOT EXISTS public.equipamento_manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos (id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'corretiva'
    CHECK (tipo IN ('preventiva', 'corretiva', 'inspecao', 'outro')),
  descricao text NOT NULL,
  foto_url text,
  realizado_por uuid REFERENCES public.usuarios (id),
  realizado_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS equipamento_manutencoes_eq_idx
  ON public.equipamento_manutencoes (equipamento_id, realizado_em DESC);

ALTER TABLE public.hotel_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamento_manutencoes ENABLE ROW LEVEL SECURITY;

-- Áreas: staff lê; admin escreve
DROP POLICY IF EXISTS "hotel_areas_staff_select" ON public.hotel_areas;
CREATE POLICY "hotel_areas_staff_select"
  ON public.hotel_areas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.ativo = true
        AND u.role IN ('admin', 'lider', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "hotel_areas_admin_insert" ON public.hotel_areas;
CREATE POLICY "hotel_areas_admin_insert"
  ON public.hotel_areas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

DROP POLICY IF EXISTS "hotel_areas_admin_update" ON public.hotel_areas;
CREATE POLICY "hotel_areas_admin_update"
  ON public.hotel_areas FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

DROP POLICY IF EXISTS "hotel_areas_admin_delete" ON public.hotel_areas;
CREATE POLICY "hotel_areas_admin_delete"
  ON public.hotel_areas FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

-- Equipamentos: staff lê; admin escreve
DROP POLICY IF EXISTS "equipamentos_staff_select" ON public.equipamentos;
CREATE POLICY "equipamentos_staff_select"
  ON public.equipamentos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.ativo = true
        AND u.role IN ('admin', 'lider', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "equipamentos_admin_insert" ON public.equipamentos;
CREATE POLICY "equipamentos_admin_insert"
  ON public.equipamentos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

DROP POLICY IF EXISTS "equipamentos_admin_update" ON public.equipamentos;
CREATE POLICY "equipamentos_admin_update"
  ON public.equipamentos FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

DROP POLICY IF EXISTS "equipamentos_admin_delete" ON public.equipamentos;
CREATE POLICY "equipamentos_admin_delete"
  ON public.equipamentos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

-- Histórico: staff lê; insert via RPC (ou staff direto)
DROP POLICY IF EXISTS "eq_manut_staff_select" ON public.equipamento_manutencoes;
CREATE POLICY "eq_manut_staff_select"
  ON public.equipamento_manutencoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.ativo = true
        AND u.role IN ('admin', 'lider', 'colaborador')
    )
  );

DROP POLICY IF EXISTS "eq_manut_staff_insert" ON public.equipamento_manutencoes;
CREATE POLICY "eq_manut_staff_insert"
  ON public.equipamento_manutencoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.ativo = true
        AND u.role IN ('admin', 'lider', 'colaborador')
    )
  );

-- Consulta pública por código (QR) — dados do equipamento + histórico recente
CREATE OR REPLACE FUNCTION public.consultar_equipamento(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo text;
  v_eq public.equipamentos%ROWTYPE;
  v_area public.hotel_areas%ROWTYPE;
BEGIN
  v_codigo := upper(trim(p_codigo));
  v_codigo := regexp_replace(v_codigo, '[^A-Z0-9\-]+', '-', 'g');
  v_codigo := regexp_replace(v_codigo, '-+', '-', 'g');
  v_codigo := trim(both '-' from v_codigo);

  SELECT * INTO v_eq
  FROM public.equipamentos
  WHERE codigo = v_codigo AND ativo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Equipamento não encontrado');
  END IF;

  SELECT * INTO v_area FROM public.hotel_areas WHERE id = v_eq.area_id;

  RETURN jsonb_build_object(
    'ok', true,
    'equipamento', jsonb_build_object(
      'id', v_eq.id,
      'nome', v_eq.nome,
      'codigo', v_eq.codigo,
      'descricao', v_eq.descricao,
      'area_id', v_eq.area_id,
      'area_nome', COALESCE(v_area.nome, ''),
      'area_descricao', v_area.descricao
    ),
    'historico', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'tipo', m.tipo,
          'descricao', m.descricao,
          'foto_url', m.foto_url,
          'realizado_em', m.realizado_em,
          'realizado_por_nome', u.nome
        )
        ORDER BY m.realizado_em DESC
      )
      FROM (
        SELECT *
        FROM public.equipamento_manutencoes
        WHERE equipamento_id = v_eq.id
        ORDER BY realizado_em DESC
        LIMIT 50
      ) m
      LEFT JOIN public.usuarios u ON u.id = m.realizado_por
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consultar_equipamento(text) TO anon, authenticated;

-- Registrar manutenção via QR (staff logado)
CREATE OR REPLACE FUNCTION public.registrar_manutencao_equipamento(
  p_codigo text,
  p_descricao text,
  p_tipo text DEFAULT 'corretiva',
  p_foto_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_codigo text;
  v_eq_id uuid;
  v_tipo text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'É necessário estar logado para registrar manutenção';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = v_uid AND u.ativo = true
      AND u.role IN ('admin', 'lider', 'colaborador')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para registrar manutenção';
  END IF;

  IF p_descricao IS NULL OR trim(p_descricao) = '' THEN
    RAISE EXCEPTION 'Descreva o que foi feito na manutenção';
  END IF;

  v_tipo := lower(coalesce(nullif(trim(p_tipo), ''), 'corretiva'));
  IF v_tipo NOT IN ('preventiva', 'corretiva', 'inspecao', 'outro') THEN
    v_tipo := 'corretiva';
  END IF;

  v_codigo := upper(trim(p_codigo));
  v_codigo := regexp_replace(v_codigo, '[^A-Z0-9\-]+', '-', 'g');
  v_codigo := regexp_replace(v_codigo, '-+', '-', 'g');
  v_codigo := trim(both '-' from v_codigo);

  SELECT id INTO v_eq_id
  FROM public.equipamentos
  WHERE codigo = v_codigo AND ativo = true;

  IF v_eq_id IS NULL THEN
    RAISE EXCEPTION 'Equipamento não encontrado ou inativo';
  END IF;

  INSERT INTO public.equipamento_manutencoes (
    equipamento_id, tipo, descricao, foto_url, realizado_por
  ) VALUES (
    v_eq_id, v_tipo, trim(p_descricao), nullif(trim(p_foto_url), ''), v_uid
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_manutencao_equipamento(text, text, text, text)
  TO authenticated;
