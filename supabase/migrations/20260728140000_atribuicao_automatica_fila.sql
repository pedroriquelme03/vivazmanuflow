-- Atribuição automática: colaborador com menos demandas na fila (atribuída + em andamento).
-- Roda depois da regra de demandas pré-definidas (trigger name sort: predefinida → atribuir_fila).

CREATE OR REPLACE FUNCTION public.colaborador_menos_demandas(p_propriedade_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.usuarios u
  LEFT JOIN public.demandas d
    ON d.colaborador_id = u.id
   AND d.status IN ('atribuida', 'em_andamento')
  WHERE u.role = 'colaborador'
    AND u.ativo = true
    AND (u.propriedade_id IS NULL OR u.propriedade_id = p_propriedade_id)
  GROUP BY u.id, u.nome
  ORDER BY COUNT(d.id) ASC, u.nome ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.trg_demanda_atribuir_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colab uuid;
  horas integer;
BEGIN
  -- Já atribuída (ex.: demanda pré-definida com colaborador fixo)
  IF NEW.colaborador_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_colab := public.colaborador_menos_demandas(NEW.propriedade_id);
  IF v_colab IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.colaborador_id := v_colab;
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

DROP TRIGGER IF EXISTS demandas_auto_atribuir_fila ON public.demandas;
CREATE TRIGGER demandas_auto_atribuir_fila
  BEFORE INSERT ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_demanda_atribuir_fila();

GRANT EXECUTE ON FUNCTION public.colaborador_menos_demandas(uuid)
  TO authenticated;
