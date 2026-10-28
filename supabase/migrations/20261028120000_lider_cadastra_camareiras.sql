-- Líder do checklist também adiciona, edita e remove camareiras.
-- Precisa de 20261020180000_checklist_ambiente.sql.

DROP POLICY IF EXISTS gov_camareiras_lider ON public.gov_camareiras;
CREATE POLICY gov_camareiras_lider ON public.gov_camareiras
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'lider')
  WITH CHECK (private.governanca_papel() = 'lider');
