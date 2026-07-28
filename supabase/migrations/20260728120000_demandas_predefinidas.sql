-- Demandas pré-definidas com colaborador fixo (ex.: "Trocar lâmpada" → João)
-- O formulário envia o título da pré-definida; o trigger atribui automaticamente.

CREATE TABLE IF NOT EXISTS public.demandas_predefinidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  prioridade public.demanda_prioridade NOT NULL DEFAULT 'media',
  colaborador_id uuid NOT NULL REFERENCES public.usuarios (id),
  propriedade_id uuid REFERENCES public.propriedades (id),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS demandas_predefinidas_titulo_prop_uidx
  ON public.demandas_predefinidas (
    lower(trim(titulo)),
    COALESCE(propriedade_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS demandas_predefinidas_ativo_idx
  ON public.demandas_predefinidas (ativo);

ALTER TABLE public.demandas_predefinidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predefinidas_select_ativas" ON public.demandas_predefinidas;
CREATE POLICY "predefinidas_select_ativas"
  ON public.demandas_predefinidas
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

DROP POLICY IF EXISTS "predefinidas_admin_select" ON public.demandas_predefinidas;
CREATE POLICY "predefinidas_admin_select"
  ON public.demandas_predefinidas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

DROP POLICY IF EXISTS "predefinidas_admin_insert" ON public.demandas_predefinidas;
CREATE POLICY "predefinidas_admin_insert"
  ON public.demandas_predefinidas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

DROP POLICY IF EXISTS "predefinidas_admin_update" ON public.demandas_predefinidas;
CREATE POLICY "predefinidas_admin_update"
  ON public.demandas_predefinidas
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

DROP POLICY IF EXISTS "predefinidas_admin_delete" ON public.demandas_predefinidas;
CREATE POLICY "predefinidas_admin_delete"
  ON public.demandas_predefinidas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

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

DROP TRIGGER IF EXISTS demandas_auto_predefinida ON public.demandas;
CREATE TRIGGER demandas_auto_predefinida
  BEFORE INSERT ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_demanda_predefinida();
