-- Preventivas da Manutenção: lugares próprios e rotinas que caem na fila no dia marcado.
-- Prioridade alta, sem responsável. O texto do chamado começa com "Preventiva:".

CREATE TABLE IF NOT EXISTS public.preventiva_locais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  propriedade_id uuid NOT NULL REFERENCES public.propriedades (id),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preventiva_locais_nome_chk CHECK (char_length(trim(nome)) > 0)
);

CREATE INDEX IF NOT EXISTS preventiva_locais_prop_idx
  ON public.preventiva_locais (propriedade_id);

CREATE TABLE IF NOT EXISTS public.preventivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id uuid NOT NULL REFERENCES public.preventiva_locais (id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  intervalo_quantidade integer NOT NULL DEFAULT 1,
  intervalo_unidade text NOT NULL DEFAULT 'mes',
  proxima_abertura date NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preventivas_titulo_chk CHECK (char_length(trim(titulo)) > 0),
  CONSTRAINT preventivas_qtd_chk CHECK (intervalo_quantidade BETWEEN 1 AND 365),
  CONSTRAINT preventivas_unidade_chk CHECK (intervalo_unidade IN ('dia', 'mes', 'ano'))
);

CREATE INDEX IF NOT EXISTS preventivas_local_idx ON public.preventivas (local_id);

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS preventiva_id uuid REFERENCES public.preventivas (id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS demandas_preventiva_idx
  ON public.demandas (preventiva_id)
  WHERE preventiva_id IS NOT NULL;

ALTER TABLE public.preventiva_locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventivas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preventiva_locais_gestor" ON public.preventiva_locais;
CREATE POLICY "preventiva_locais_gestor"
  ON public.preventiva_locais
  FOR ALL
  TO authenticated
  USING (private.meu_role() IN ('admin'::user_role, 'lider'::user_role))
  WITH CHECK (private.meu_role() IN ('admin'::user_role, 'lider'::user_role));

DROP POLICY IF EXISTS "preventivas_gestor" ON public.preventivas;
CREATE POLICY "preventivas_gestor"
  ON public.preventivas
  FOR ALL
  TO authenticated
  USING (private.meu_role() IN ('admin'::user_role, 'lider'::user_role))
  WITH CHECK (private.meu_role() IN ('admin'::user_role, 'lider'::user_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventiva_locais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventivas TO authenticated;

CREATE OR REPLACE FUNCTION public.abrir_preventivas_vencidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_sol uuid;
  v_id uuid;
  v_prox date;
  v_titulo text;
  v_abertas integer := 0;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_guard integer;
BEGIN
  IF private.meu_role() NOT IN ('admin'::user_role, 'lider'::user_role) THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT
      p.id,
      p.titulo,
      p.descricao,
      p.intervalo_quantidade,
      p.intervalo_unidade,
      p.proxima_abertura,
      l.nome AS local_nome,
      l.propriedade_id
    FROM public.preventivas p
    JOIN public.preventiva_locais l ON l.id = p.local_id
    WHERE p.ativo
      AND l.ativo
      AND p.proxima_abertura <= v_hoje
    ORDER BY p.proxima_abertura, l.nome, p.titulo
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.demandas d
      WHERE d.preventiva_id = r.id
        AND d.arquivado = false
        AND d.status NOT IN ('concluida'::public.demanda_status, 'cancelada'::public.demanda_status)
    ) THEN
      CONTINUE;
    END IF;

    SELECT s.id INTO v_sol
    FROM public.solicitantes s
    WHERE s.propriedade_id = r.propriedade_id
      AND lower(trim(s.nome)) = 'preventiva'
      AND s.ativo = true
    ORDER BY s.criado_em
    LIMIT 1;

    IF v_sol IS NULL THEN
      INSERT INTO public.solicitantes (nome, propriedade_id, ativo)
      VALUES ('Preventiva', r.propriedade_id, true)
      RETURNING id INTO v_sol;
    END IF;

    IF lower(trim(r.titulo)) LIKE 'preventiva:%' THEN
      v_titulo := trim(r.titulo);
    ELSE
      v_titulo := 'Preventiva: ' || trim(r.titulo);
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
      sublocal,
      preventiva_id,
      afeta_experiencia
    ) VALUES (
      v_sol,
      r.propriedade_id,
      v_titulo,
      nullif(trim(COALESCE(r.descricao, '')), ''),
      'alta'::public.demanda_prioridade,
      'aberta'::public.demanda_status,
      'manutencao'::public.ambiente_equipe,
      NULL,
      trim(r.local_nome),
      r.id,
      false
    )
    RETURNING id INTO v_id;

    INSERT INTO public.demanda_historico (
      demanda_id, status_anterior, status_novo, observacao
    ) VALUES (
      v_id, NULL, 'aberta', 'Preventiva aberta automaticamente'
    );

    v_prox := r.proxima_abertura;
    v_guard := 0;
    WHILE v_prox <= v_hoje AND v_guard < 400 LOOP
      v_prox := CASE r.intervalo_unidade
        WHEN 'dia' THEN (v_prox + make_interval(days => r.intervalo_quantidade))::date
        WHEN 'ano' THEN (v_prox + make_interval(years => r.intervalo_quantidade))::date
        ELSE (v_prox + make_interval(months => r.intervalo_quantidade))::date
      END;
      v_guard := v_guard + 1;
    END LOOP;

    UPDATE public.preventivas
    SET proxima_abertura = v_prox
    WHERE id = r.id;

    v_abertas := v_abertas + 1;
  END LOOP;

  RETURN v_abertas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.abrir_preventivas_vencidas() TO authenticated;
