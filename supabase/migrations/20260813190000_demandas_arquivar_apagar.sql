-- Arquivar demandas no quadro + exclusão pelo líder/admin.

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS demandas_arquivado_idx
  ON public.demandas (arquivado);

CREATE OR REPLACE FUNCTION public.apagar_demanda(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar logado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid() AND u.ativo = true
      AND u.role IN ('admin', 'lider')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para apagar demandas';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.demandas WHERE id = p_id) THEN
    RAISE EXCEPTION 'Demanda não encontrada';
  END IF;

  DELETE FROM public.demanda_anexos WHERE demanda_id = p_id;
  DELETE FROM public.demanda_historico WHERE demanda_id = p_id;
  DELETE FROM public.demandas WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apagar_demanda(uuid) TO authenticated;
