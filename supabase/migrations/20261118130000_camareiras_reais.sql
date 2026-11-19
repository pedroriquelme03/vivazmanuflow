-- Camareiras reais da Governança (Vivaz Cataratas), as mesmas da lista
-- "Nome da camareira" do Checklist Fácil, mais "Outra" para quem não está na lista.
-- As 4 de teste (Ana Souza, Joana Oliveira, Maria Silva, Rita Santos) saem:
-- quem nunca foi usada em vistoria é apagada; quem já foi fica inativa
-- (o banco não deixa apagar colaborador com vistoria ligada).
-- Pode rodar mais de uma vez: não duplica ninguém.
-- Precisa de 20261112120000_checklist_setores.sql.

DO $$
DECLARE
  v_setor uuid;
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

  -- Tira as de teste.
  DELETE FROM public.gov_camareiras c
  WHERE c.setor_id = v_setor
    AND c.nome IN ('Ana Souza', 'Joana Oliveira', 'Maria Silva', 'Rita Santos')
    AND NOT EXISTS (SELECT 1 FROM public.gov_inspecoes i WHERE i.camareira_id = c.id);

  UPDATE public.gov_camareiras
  SET ativo = false
  WHERE setor_id = v_setor
    AND nome IN ('Ana Souza', 'Joana Oliveira', 'Maria Silva', 'Rita Santos');

  -- Coloca as reais (e reativa se já existirem).
  INSERT INTO public.gov_camareiras (nome, setor_id, ativo)
  SELECT n.nome, v_setor, true
  FROM (VALUES
    ('Ana Diaz'),
    ('Beatriz Ribeiro'),
    ('Ilda da Costa'),
    ('Marilene de Souza Cabral'),
    ('Marjoris Sanchez Zamora'),
    ('Michelle Gonçalves'),
    ('Remily da Silva'),
    ('Suelma Santana'),
    ('Sheila da Concepção'),
    ('Marizete Kurylo'),
    ('Rosinei Silveira Lopes'),
    ('Sandra Maria Felicio Bueno'),
    ('Rosenilda Rosa Hartmann'),
    ('Liliany Perdomo Mozo'),
    ('Outra')
  ) AS n(nome)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.gov_camareiras c
    WHERE c.setor_id = v_setor AND lower(btrim(c.nome)) = lower(n.nome)
  );

  UPDATE public.gov_camareiras
  SET ativo = true
  WHERE setor_id = v_setor
    AND lower(btrim(nome)) IN (
      'ana diaz', 'beatriz ribeiro', 'ilda da costa', 'marilene de souza cabral',
      'marjoris sanchez zamora', 'michelle gonçalves', 'remily da silva', 'suelma santana',
      'sheila da concepção', 'marizete kurylo', 'rosinei silveira lopes',
      'sandra maria felicio bueno', 'rosenilda rosa hartmann', 'liliany perdomo mozo', 'outra'
    );
END $$;
