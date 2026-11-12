-- Checklist, Fase 3 (primeira parte): perguntas no padrão do Checklist Fácil.
--   * peso: quanto a pergunta Sim/Não vale na nota (0 = não pontua). A resposta guarda
--     uma cópia do peso, para a nota antiga não mudar se o peso mudar depois.
--   * exige: por resposta, o que vira obrigatório. Ex.: {"nao": ["foto", "comentario"]}.
--     A chave é "sim", "nao", a carinha ("ruim", "regular", "bom") ou o texto da opção.
--   * gov_dependencias (condicionais): a resposta `gatilho` da pergunta mostra outra
--     pergunta ou uma seção inteira. Sem a resposta, o alvo fica escondido e não conta.
-- Quem edita o checklist (admin e líder do setor) edita também isso.
-- Precisa de 20261112160000_checklist_fase2.sql. Pode rodar de novo.

ALTER TABLE public.gov_perguntas
  ADD COLUMN IF NOT EXISTS peso numeric NOT NULL DEFAULT 1 CHECK (peso >= 0),
  ADD COLUMN IF NOT EXISTS exige jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.gov_respostas
  ADD COLUMN IF NOT EXISTS pergunta_peso numeric NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.gov_dependencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id uuid NOT NULL REFERENCES public.gov_perguntas(id) ON DELETE CASCADE,
  gatilho text NOT NULL CHECK (btrim(gatilho) <> ''),
  filho_pergunta_id uuid REFERENCES public.gov_perguntas(id) ON DELETE CASCADE,
  filho_secao_id uuid REFERENCES public.gov_secoes(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gov_dependencias_um_alvo CHECK ((filho_pergunta_id IS NULL) <> (filho_secao_id IS NULL)),
  CONSTRAINT gov_dependencias_nao_ela_mesma CHECK (filho_pergunta_id IS DISTINCT FROM pergunta_id)
);

CREATE INDEX IF NOT EXISTS gov_dependencias_pergunta_idx ON public.gov_dependencias (pergunta_id);
CREATE UNIQUE INDEX IF NOT EXISTS gov_dependencias_unica
  ON public.gov_dependencias (pergunta_id, gatilho, coalesce(filho_pergunta_id, filho_secao_id));

-- Quem cuida da pergunta: admin ou líder do setor do checklist dela.
CREATE OR REPLACE FUNCTION private.gov_gerencia_pergunta(p_pergunta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT private.gov_gerencia_secao(q.secao_id) FROM public.gov_perguntas q WHERE q.id = p_pergunta_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION private.gov_gerencia_pergunta(uuid) TO authenticated;

ALTER TABLE public.gov_dependencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gov_dependencias_ler ON public.gov_dependencias;
CREATE POLICY gov_dependencias_ler ON public.gov_dependencias
  FOR SELECT TO authenticated
  USING (private.governanca_papel() IS NOT NULL);

DROP POLICY IF EXISTS gov_dependencias_editar ON public.gov_dependencias;
CREATE POLICY gov_dependencias_editar ON public.gov_dependencias
  FOR ALL TO authenticated
  USING (private.gov_gerencia_pergunta(pergunta_id))
  WITH CHECK (private.gov_gerencia_pergunta(pergunta_id));
