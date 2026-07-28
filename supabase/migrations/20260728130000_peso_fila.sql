-- Peso da demanda (define posição na fila) + impacto na experiência do hóspede

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS peso integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS afeta_experiencia boolean NOT NULL DEFAULT false;

ALTER TABLE public.demandas
  DROP CONSTRAINT IF EXISTS demandas_peso_check;
ALTER TABLE public.demandas
  ADD CONSTRAINT demandas_peso_check CHECK (peso >= 1 AND peso <= 10);

CREATE INDEX IF NOT EXISTS demandas_peso_fila_idx
  ON public.demandas (peso DESC, criado_em ASC);

-- Configuração única dos pesos base
CREATE TABLE IF NOT EXISTS public.peso_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  peso_alta integer NOT NULL DEFAULT 7 CHECK (peso_alta BETWEEN 1 AND 10),
  peso_media integer NOT NULL DEFAULT 4 CHECK (peso_media BETWEEN 1 AND 10),
  peso_baixa integer NOT NULL DEFAULT 2 CHECK (peso_baixa BETWEEN 1 AND 10),
  peso_experiencia integer NOT NULL DEFAULT 10 CHECK (peso_experiencia BETWEEN 1 AND 10),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.peso_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.peso_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "peso_config_select" ON public.peso_config;
CREATE POLICY "peso_config_select"
  ON public.peso_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "peso_config_admin_update" ON public.peso_config;
CREATE POLICY "peso_config_admin_update"
  ON public.peso_config
  FOR UPDATE
  TO authenticated
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

CREATE OR REPLACE FUNCTION public.calcular_peso_demanda(
  p_prioridade public.demanda_prioridade,
  p_afeta_experiencia boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.peso_config%ROWTYPE;
  base integer;
BEGIN
  SELECT * INTO cfg FROM public.peso_config WHERE id = 1;
  IF NOT FOUND THEN
    cfg.peso_alta := 7;
    cfg.peso_media := 4;
    cfg.peso_baixa := 2;
    cfg.peso_experiencia := 10;
  END IF;

  IF COALESCE(p_afeta_experiencia, false) THEN
    RETURN cfg.peso_experiencia;
  END IF;

  base := CASE p_prioridade
    WHEN 'alta' THEN cfg.peso_alta
    WHEN 'baixa' THEN cfg.peso_baixa
    ELSE cfg.peso_media
  END;

  RETURN base;
END;
$$;

-- Define peso automaticamente na inserção (antes dos demais triggers)
CREATE OR REPLACE FUNCTION public.trg_demanda_definir_peso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.peso := public.calcular_peso_demanda(
    NEW.prioridade,
    COALESCE(NEW.afeta_experiencia, false)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demandas_definir_peso ON public.demandas;
CREATE TRIGGER demandas_definir_peso
  BEFORE INSERT ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_demanda_definir_peso();

-- Aplica impacto na experiência após abrir (sem alterar a assinatura atual de abrir_demanda)
CREATE OR REPLACE FUNCTION public.aplicar_experiencia_hospede(
  p_token text,
  p_afeta boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.demandas d
  SET
    afeta_experiencia = COALESCE(p_afeta, true),
    peso = CASE
      WHEN COALESCE(p_afeta, true) THEN COALESCE(
        (SELECT peso_experiencia FROM public.peso_config WHERE id = 1),
        10
      )
      ELSE public.calcular_peso_demanda(d.prioridade, false)
    END
  WHERE d.token_acompanhamento = p_token
    AND d.criado_em > now() - interval '15 minutes';

  IF NOT EXISTS (
    SELECT 1 FROM public.demandas
    WHERE token_acompanhamento = p_token
      AND criado_em > now() - interval '15 minutes'
  ) THEN
    RAISE EXCEPTION 'Demanda não encontrada ou expirada para ajuste de peso';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aplicar_experiencia_hospede(text, boolean)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.calcular_peso_demanda(public.demanda_prioridade, boolean)
  TO anon, authenticated;
