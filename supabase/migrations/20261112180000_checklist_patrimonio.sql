-- Checklist: dados e patrimônio de cada local (UH ou área).
--   * Local ganha características: categoria (ex.: LUXO FRENTE HOTEL), acomodação
--     (ex.: CASAL + 2) e se permite pet.
--   * gov_tipos_item: tipos de item do patrimônio (TV, Ar-condicionado, Cofre...).
--   * gov_local_itens: os itens de cada local, com marca e modelo (uma linha por item;
--     UH com dois ares tem duas linhas).
--   * Pergunta pode ser ligada a um tipo de item: na hora de responder aparece o que
--     está cadastrado no local, e quem aplica avisa se encontrou outro modelo.
--   * A resposta guarda o que estava cadastrado, se era diferente e o que foi encontrado.
-- Precisa de 20261112170000_checklist_fase3.sql. Pode rodar de novo.

ALTER TABLE public.gov_acomodacoes
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS acomodacao text,
  ADD COLUMN IF NOT EXISTS permite_pet boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.gov_tipos_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (btrim(nome) <> ''),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gov_tipos_item_nome_unico ON public.gov_tipos_item (lower(btrim(nome)));

INSERT INTO public.gov_tipos_item (nome)
VALUES ('TV'), ('Ar-condicionado'), ('Frigobar'), ('Cofre'), ('Banheira de hidromassagem'), ('Alexa')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gov_local_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id uuid NOT NULL REFERENCES public.gov_acomodacoes(id) ON DELETE CASCADE,
  tipo_item_id uuid NOT NULL REFERENCES public.gov_tipos_item(id) ON DELETE RESTRICT,
  marca text,
  modelo text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gov_local_itens_local_idx ON public.gov_local_itens (local_id);

ALTER TABLE public.gov_perguntas
  ADD COLUMN IF NOT EXISTS tipo_item_id uuid REFERENCES public.gov_tipos_item(id) ON DELETE SET NULL;

ALTER TABLE public.gov_respostas
  ADD COLUMN IF NOT EXISTS item_previsto text,
  ADD COLUMN IF NOT EXISTS item_diferente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS item_encontrado text;

-- RLS: quem usa o checklist lê; o admin cadastra (como os locais).
ALTER TABLE public.gov_tipos_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_local_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gov_tipos_item_ler ON public.gov_tipos_item;
CREATE POLICY gov_tipos_item_ler ON public.gov_tipos_item
  FOR SELECT TO authenticated USING (private.governanca_papel() IS NOT NULL);

DROP POLICY IF EXISTS gov_tipos_item_admin ON public.gov_tipos_item;
CREATE POLICY gov_tipos_item_admin ON public.gov_tipos_item
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');

DROP POLICY IF EXISTS gov_local_itens_ler ON public.gov_local_itens;
CREATE POLICY gov_local_itens_ler ON public.gov_local_itens
  FOR SELECT TO authenticated USING (private.governanca_papel() IS NOT NULL);

DROP POLICY IF EXISTS gov_local_itens_admin ON public.gov_local_itens;
CREATE POLICY gov_local_itens_admin ON public.gov_local_itens
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');
