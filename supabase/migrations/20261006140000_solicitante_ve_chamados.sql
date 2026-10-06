-- Solicitante vê só os chamados abertos no próprio nome (cadastro de solicitantes).

DROP POLICY IF EXISTS "dem_sel_solicitante" ON public.demandas;
CREATE POLICY "dem_sel_solicitante"
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (
    private.meu_role() = 'solicitante'::user_role
    AND EXISTS (
      SELECT 1
      FROM public.solicitantes s
      JOIN public.usuarios u ON u.id = auth.uid()
      WHERE s.id = demandas.solicitante_id
        AND u.ativo = true
        AND lower(trim(s.nome)) = lower(trim(u.nome))
    )
  );

DROP POLICY IF EXISTS "anexos_sel_solicitante" ON public.demanda_anexos;
CREATE POLICY "anexos_sel_solicitante"
  ON public.demanda_anexos
  FOR SELECT
  TO authenticated
  USING (
    private.meu_role() = 'solicitante'::user_role
    AND EXISTS (
      SELECT 1
      FROM public.demandas d
      JOIN public.solicitantes s ON s.id = d.solicitante_id
      JOIN public.usuarios u ON u.id = auth.uid()
      WHERE d.id = demanda_anexos.demanda_id
        AND u.ativo = true
        AND lower(trim(s.nome)) = lower(trim(u.nome))
    )
  );
