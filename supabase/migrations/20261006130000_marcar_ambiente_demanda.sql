-- Solicitante (e o quadro) precisa marcar o chamado como TI depois de abrir.
-- O INSERT de abrir_demanda nasce em Manutenção; o UPDATE direto na tabela
-- o papel solicitante não consegue fazer (RLS).

CREATE OR REPLACE FUNCTION public.marcar_ambiente_demanda(
  p_demanda_id uuid,
  p_ambiente public.ambiente_equipe
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.meu_role() NOT IN (
    'admin'::user_role,
    'lider'::user_role,
    'solicitante'::user_role
  ) THEN
    RAISE EXCEPTION 'Sem permissão para definir o quadro';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.demandas WHERE id = p_demanda_id) THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  UPDATE public.demandas
  SET
    ambiente = p_ambiente,
    colaborador_id = CASE
      WHEN p_ambiente = 'ti'::public.ambiente_equipe THEN NULL
      ELSE colaborador_id
    END,
    status = CASE
      WHEN p_ambiente = 'ti'::public.ambiente_equipe THEN 'aberta'::public.demanda_status
      ELSE status
    END,
    atribuido_em = CASE
      WHEN p_ambiente = 'ti'::public.ambiente_equipe THEN NULL
      ELSE atribuido_em
    END
  WHERE id = p_demanda_id;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_ambiente_demanda(uuid, public.ambiente_equipe) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_ambiente_demanda(uuid, public.ambiente_equipe)
  TO authenticated;
