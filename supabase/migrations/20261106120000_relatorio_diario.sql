-- Relatório diário da governança: o líder envia o PDF "Relatório de UHs para
-- Governança - Resumido" do Desbravador e as UHs que precisam de limpeza no dia
-- viram uma lista de checklist que a equipe vai marcando.
-- Precisa de 20261020180000_checklist_ambiente.sql.

CREATE TABLE IF NOT EXISTS public.gov_relatorios_diarios (
  data date PRIMARY KEY,
  emitido_em text,
  enviado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gov_relatorio_uhs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL REFERENCES public.gov_relatorios_diarios(data) ON DELETE CASCADE,
  numero text NOT NULL,
  tipo text NOT NULL DEFAULT '',
  situacao text NOT NULL DEFAULT '',
  movimentos text[] NOT NULL DEFAULT '{}',
  tarefa text NOT NULL DEFAULT '',
  feita_em timestamptz,
  feita_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  UNIQUE (data, numero)
);

ALTER TABLE public.gov_relatorios_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_relatorio_uhs ENABLE ROW LEVEL SECURITY;

-- Todos do checklist veem a lista do dia.
DROP POLICY IF EXISTS gov_relatorios_diarios_ler ON public.gov_relatorios_diarios;
CREATE POLICY gov_relatorios_diarios_ler ON public.gov_relatorios_diarios
  FOR SELECT TO authenticated
  USING (private.governanca_papel() IS NOT NULL);

DROP POLICY IF EXISTS gov_relatorio_uhs_ler ON public.gov_relatorio_uhs;
CREATE POLICY gov_relatorio_uhs_ler ON public.gov_relatorio_uhs
  FOR SELECT TO authenticated
  USING (private.governanca_papel() IS NOT NULL);

-- Admin e líder enviam, trocam e apagam o relatório do dia.
DROP POLICY IF EXISTS gov_relatorios_diarios_equipe ON public.gov_relatorios_diarios;
CREATE POLICY gov_relatorios_diarios_equipe ON public.gov_relatorios_diarios
  FOR ALL TO authenticated
  USING (private.governanca_papel() IN ('admin', 'lider'))
  WITH CHECK (private.governanca_papel() IN ('admin', 'lider'));

DROP POLICY IF EXISTS gov_relatorio_uhs_equipe ON public.gov_relatorio_uhs;
CREATE POLICY gov_relatorio_uhs_equipe ON public.gov_relatorio_uhs
  FOR ALL TO authenticated
  USING (private.governanca_papel() IN ('admin', 'lider'))
  WITH CHECK (private.governanca_papel() IN ('admin', 'lider'));

-- Camareira só marca e desmarca a UH como feita.
CREATE OR REPLACE FUNCTION public.gov_marcar_uh_relatorio(p_id uuid, p_feita boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.governanca_papel() IS NULL THEN
    RAISE EXCEPTION 'Sem acesso ao checklist';
  END IF;
  UPDATE public.gov_relatorio_uhs
  SET feita_em = CASE WHEN p_feita THEN now() ELSE NULL END,
      feita_por = CASE WHEN p_feita THEN auth.uid() ELSE NULL END
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.gov_marcar_uh_relatorio(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gov_marcar_uh_relatorio(uuid, boolean) TO authenticated;
