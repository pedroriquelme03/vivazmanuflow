-- Checklist: patrimônio separado em Eletrônicos e Mobília, número de patrimônio por item
-- e correção da UH 1104 que veio duas vezes na planilha.
--   * gov_tipos_item.grupo: 'eletronico' (TV, ar, cofre...) ou 'mobilia' (cama, armário,
--     banheira de hidromassagem...). Na tela do local cada grupo tem a sua seção.
--   * gov_local_itens.patrimonio: número da plaqueta, opcional (preenchido depois).
--     Não repete: o mesmo número não pode estar em dois itens.
--   * A planilha trazia a 1104 duas vezes; a linha "LUXO PISCINA" é da 1105 (pares são
--     Frente Hotel, ímpares Piscina). Os itens dessa linha passam para a 1105.
-- Precisa de 20261112181000_checklist_patrimonio_uhs.sql. Pode rodar de novo.

ALTER TABLE public.gov_tipos_item
  ADD COLUMN IF NOT EXISTS grupo text NOT NULL DEFAULT 'eletronico';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gov_tipos_item_grupo_check') THEN
    ALTER TABLE public.gov_tipos_item
      ADD CONSTRAINT gov_tipos_item_grupo_check CHECK (grupo IN ('eletronico', 'mobilia'));
  END IF;
END $$;

UPDATE public.gov_tipos_item SET grupo = 'mobilia' WHERE lower(nome) = 'banheira de hidromassagem';

ALTER TABLE public.gov_local_itens
  ADD COLUMN IF NOT EXISTS patrimonio text;

CREATE UNIQUE INDEX IF NOT EXISTS gov_local_itens_patrimonio_unico
  ON public.gov_local_itens (lower(btrim(patrimonio)))
  WHERE patrimonio IS NOT NULL;

-- 1104 / 1105 (só se a 1105 ainda estiver sem itens: rodar de novo não mexe).
DO $$
DECLARE
  uh_1104 uuid;
  uh_1105 uuid;
BEGIN
  SELECT a.id INTO uh_1104
  FROM public.gov_acomodacoes a
  JOIN public.propriedades p ON p.id = a.propriedade_id AND p.nome ILIKE '%vivaz%'
  WHERE a.numero = '1104' AND a.tipo IN ('suite', 'apartamento');

  SELECT a.id INTO uh_1105
  FROM public.gov_acomodacoes a
  JOIN public.propriedades p ON p.id = a.propriedade_id AND p.nome ILIKE '%vivaz%'
  WHERE a.numero = '1105' AND a.tipo IN ('suite', 'apartamento');

  IF uh_1104 IS NULL OR uh_1105 IS NULL
     OR EXISTS (SELECT 1 FROM public.gov_local_itens WHERE local_id = uh_1105) THEN
    RETURN;
  END IF;

  UPDATE public.gov_acomodacoes
  SET categoria = 'LUXO FRENTE HOTEL', acomodacao = 'CASAL + 2', permite_pet = true
  WHERE id = uh_1104;

  UPDATE public.gov_acomodacoes
  SET categoria = 'LUXO PISCINA', acomodacao = 'CASAL + 2', permite_pet = true
  WHERE id = uh_1105;

  -- Itens da linha "LUXO PISCINA": ar LG 12000, cofre DLOCK, TV LG 50' e um dos dois
  -- frigobares MIDEA 76L (a 1104 tinha dois iguais, um de cada linha).
  UPDATE public.gov_local_itens i
  SET local_id = uh_1105
  FROM public.gov_tipos_item t
  WHERE i.tipo_item_id = t.id
    AND i.local_id = uh_1104
    AND (
      (t.nome = 'Ar-condicionado' AND i.marca = 'LG' AND i.modelo = '12000')
      OR (t.nome = 'Cofre' AND i.marca = 'DLOCK')
      OR (t.nome = 'TV' AND i.marca = 'LG' AND i.modelo = '50''')
    );

  UPDATE public.gov_local_itens
  SET local_id = uh_1105
  WHERE id = (
    SELECT i.id
    FROM public.gov_local_itens i
    JOIN public.gov_tipos_item t ON t.id = i.tipo_item_id
    WHERE i.local_id = uh_1104 AND t.nome = 'Frigobar' AND i.marca = 'MIDEA' AND i.modelo = '76L'
    ORDER BY i.criado_em DESC, i.id
    LIMIT 1
  );
END $$;

-- Confere: cada uma deve ter 4 itens.
SELECT a.numero, a.categoria, count(i.id) AS itens
FROM public.gov_acomodacoes a
JOIN public.propriedades p ON p.id = a.propriedade_id AND p.nome ILIKE '%vivaz%'
LEFT JOIN public.gov_local_itens i ON i.local_id = a.id
WHERE a.numero IN ('1104', '1105')
GROUP BY a.numero, a.categoria
ORDER BY a.numero;
