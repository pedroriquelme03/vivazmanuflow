-- Eventos: demandas podem ser vinculadas a um evento (para métricas e filtro).

CREATE TABLE IF NOT EXISTS public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  data_inicio date,
  data_fim date,
  propriedade_id uuid REFERENCES public.propriedades (id),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eventos_ativo_idx ON public.eventos (ativo);
CREATE INDEX IF NOT EXISTS eventos_prop_idx ON public.eventos (propriedade_id);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_select_ativos" ON public.eventos;
CREATE POLICY "eventos_select_ativos"
  ON public.eventos
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

DROP POLICY IF EXISTS "eventos_admin_select" ON public.eventos;
CREATE POLICY "eventos_admin_select"
  ON public.eventos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'lider') AND u.ativo = true
    )
  );

DROP POLICY IF EXISTS "eventos_admin_insert" ON public.eventos;
CREATE POLICY "eventos_admin_insert"
  ON public.eventos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

DROP POLICY IF EXISTS "eventos_admin_update" ON public.eventos;
CREATE POLICY "eventos_admin_update"
  ON public.eventos
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

DROP POLICY IF EXISTS "eventos_admin_delete" ON public.eventos;
CREATE POLICY "eventos_admin_delete"
  ON public.eventos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.ativo = true
    )
  );

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS evento_id uuid REFERENCES public.eventos (id);

CREATE INDEX IF NOT EXISTS demandas_evento_idx ON public.demandas (evento_id)
  WHERE evento_id IS NOT NULL;

-- Vincula evento após abrir_demanda (sem alterar a assinatura atual da RPC)
CREATE OR REPLACE FUNCTION public.vincular_evento_demanda(
  p_token text,
  p_evento_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem public.demandas%ROWTYPE;
  v_ev public.eventos%ROWTYPE;
BEGIN
  SELECT * INTO v_dem
  FROM public.demandas
  WHERE token_acompanhamento = p_token
    AND criado_em > now() - interval '15 minutes'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda não encontrada ou expirada';
  END IF;

  SELECT * INTO v_ev
  FROM public.eventos
  WHERE id = p_evento_id AND ativo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento inválido ou inativo';
  END IF;

  IF v_ev.propriedade_id IS NOT NULL
     AND v_ev.propriedade_id <> v_dem.propriedade_id THEN
    RAISE EXCEPTION 'Evento não pertence a este local';
  END IF;

  UPDATE public.demandas
  SET evento_id = p_evento_id
  WHERE id = v_dem.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vincular_evento_demanda(text, uuid)
  TO anon, authenticated;
