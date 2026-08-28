-- Colaborador vê anexos da demanda aberta no pool (antes de "Pegar").
-- Policies extras no Postgres são OR: não tira o acesso de quem já via depois de atribuída.

DROP POLICY IF EXISTS "anexos_staff_fila_aberta" ON public.demanda_anexos;

CREATE POLICY "anexos_staff_fila_aberta"
ON public.demanda_anexos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demandas d
    JOIN public.usuarios u ON u.id = auth.uid()
    WHERE d.id = demanda_anexos.demanda_id
      AND u.ativo = true
      AND (
        d.colaborador_id = auth.uid()
        OR u.role IN ('lider', 'admin')
        OR (
          d.status = 'aberta'
          AND d.colaborador_id IS NULL
          AND COALESCE(d.arquivado, false) = false
        )
      )
  )
);
