-- Setores do hotel no cadastro de acomodações do checklist.
-- Ficam só cadastrados: não aparecem na escolha de UH ao preencher um checklist.
-- Setor que já existe (mesmo nome) fica como está, então rodar de novo não duplica.

ALTER TABLE public.gov_acomodacoes DROP CONSTRAINT IF EXISTS gov_acomodacoes_tipo_check;
ALTER TABLE public.gov_acomodacoes
  ADD CONSTRAINT gov_acomodacoes_tipo_check CHECK (tipo IN ('suite', 'apartamento', 'setor'));

WITH novos (numero, tipo) AS (
  VALUES
    ('AQUAMANIA', 'setor'),
    ('EVENTOS', 'setor'),
    ('HOTEL A&B', 'setor'),
    ('MANUTENÇÃO', 'setor')
),
inseridos AS (
  INSERT INTO public.gov_acomodacoes (numero, tipo)
  SELECT numero, tipo FROM novos
  ON CONFLICT (numero) DO NOTHING
  RETURNING 1
)
SELECT
  (SELECT count(*) FROM inseridos) AS cadastrados_agora,
  (SELECT count(*) FROM novos) - (SELECT count(*) FROM inseridos) AS ja_existiam,
  (SELECT count(*) FROM public.gov_acomodacoes) + (SELECT count(*) FROM inseridos) AS total_no_checklist;
