-- Checklist: grupos de itens editáveis (antes fixos: Eletrônicos, Mobília, Equipamentos).
--   * gov_grupos_item: o admin cria, renomeia, desativa e exclui grupos (ex.: "Máquinas").
--     O código é fixo (o nome pode mudar à vontade).
--   * Cada tipo de item (TV, Bomba...) é de um grupo; cada categoria da árvore diz quais
--     grupos a ficha dos locais mostra.
-- Precisa de 20261116120000_checklist_locais_arvore.sql. Pode rodar de novo.

CREATE TABLE IF NOT EXISTS public.gov_grupos_item (
  codigo text PRIMARY KEY CHECK (codigo ~ '^[a-z0-9_]+$'),
  nome text NOT NULL CHECK (btrim(nome) <> ''),
  exemplos text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gov_grupos_item_nome_unico ON public.gov_grupos_item (lower(btrim(nome)));

INSERT INTO public.gov_grupos_item (codigo, nome, exemplos, ordem) VALUES
  ('eletronico', 'Eletrônicos', 'TV, ar-condicionado, frigobar, cofre…', 1),
  ('mobilia', 'Mobília', 'Cama, armário, banheira de hidromassagem…', 2),
  ('equipamento', 'Equipamentos', 'Bomba, filtro, quadro elétrico, gerador…', 3)
ON CONFLICT (codigo) DO NOTHING;

-- O grupo do tipo passa a apontar para a tabela (renomear o grupo não mexe nos tipos).
ALTER TABLE public.gov_tipos_item DROP CONSTRAINT IF EXISTS gov_tipos_item_grupo_check;
UPDATE public.gov_tipos_item SET grupo = 'eletronico'
WHERE grupo NOT IN (SELECT codigo FROM public.gov_grupos_item);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gov_tipos_item_grupo_fkey') THEN
    ALTER TABLE public.gov_tipos_item
      ADD CONSTRAINT gov_tipos_item_grupo_fkey FOREIGN KEY (grupo)
      REFERENCES public.gov_grupos_item(codigo) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.gov_grupos_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gov_grupos_item_ler ON public.gov_grupos_item;
CREATE POLICY gov_grupos_item_ler ON public.gov_grupos_item
  FOR SELECT TO authenticated USING (private.governanca_papel() IS NOT NULL);

DROP POLICY IF EXISTS gov_grupos_item_admin ON public.gov_grupos_item;
CREATE POLICY gov_grupos_item_admin ON public.gov_grupos_item
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');
