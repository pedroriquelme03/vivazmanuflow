-- O peso da fila acompanha prioridade e experiência também quando o admin edita o chamado.

DROP TRIGGER IF EXISTS demandas_definir_peso ON public.demandas;
CREATE TRIGGER demandas_definir_peso
  BEFORE INSERT OR UPDATE OF prioridade, afeta_experiencia
  ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_demanda_definir_peso();
