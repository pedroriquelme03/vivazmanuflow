-- Apaga de vez as camareiras de teste (Ana Souza, Joana Oliveira, Maria Silva,
-- Rita Santos) da Governança da Vivaz Cataratas.
-- O banco não deixa apagar quem está numa vistoria; então essas vistorias (todas
-- de teste) ficam sem colaborador avaliado e a camareira de teste é apagada.
-- As vistorias NÃO são apagadas.

DO $$
DECLARE
  v_setor uuid;
  v_ids uuid[];
BEGIN
  SELECT s.id INTO v_setor
  FROM public.gov_setores s
  JOIN public.propriedades p ON p.id = s.propriedade_id
  WHERE lower(btrim(s.nome)) = 'governança'
    AND lower(btrim(p.nome)) = 'vivaz cataratas'
  LIMIT 1;
  IF v_setor IS NULL THEN
    RAISE EXCEPTION 'Setor Governança da Vivaz Cataratas não encontrado';
  END IF;

  SELECT array_agg(c.id) INTO v_ids
  FROM public.gov_camareiras c
  WHERE c.setor_id = v_setor
    AND c.nome IN ('Ana Souza', 'Joana Oliveira', 'Maria Silva', 'Rita Santos');
  IF v_ids IS NULL THEN
    RETURN; -- Já foram apagadas.
  END IF;

  UPDATE public.gov_inspecoes SET camareira_id = NULL WHERE camareira_id = ANY (v_ids);
  DELETE FROM public.gov_camareiras WHERE id = ANY (v_ids);
END $$;
