-- Módulo Novidades: guarda os dados das ferramentas novas (inventário, criticidade,
-- backlog, PMOC) num único lugar. Cada registro é um documento JSON identificado
-- pelo tipo + referência (id do equipamento, do chamado, ou 'geral').

CREATE TABLE IF NOT EXISTS public.novidades_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  ref_id text NOT NULL DEFAULT 'geral',
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_por uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT novidades_registros_tipo_chk
    CHECK (tipo IN ('inventario', 'criticidade', 'backlog', 'backlog_capacidade', 'pmoc')),
  CONSTRAINT novidades_registros_unico UNIQUE (tipo, ref_id)
);

CREATE INDEX IF NOT EXISTS novidades_registros_tipo_idx
  ON public.novidades_registros (tipo);

ALTER TABLE public.novidades_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "novidades_registros_gestor" ON public.novidades_registros;
CREATE POLICY "novidades_registros_gestor"
  ON public.novidades_registros
  FOR ALL
  TO authenticated
  USING (private.meu_role() IN ('admin'::user_role, 'lider'::user_role))
  WITH CHECK (private.meu_role() IN ('admin'::user_role, 'lider'::user_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.novidades_registros TO authenticated;
