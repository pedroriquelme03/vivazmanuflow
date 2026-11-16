-- Checklist: plano de ação configurável (5W2H).
--   * gov_perguntas.plano_campos: quais campos extras o plano pede e se são obrigatórios,
--     ex.: {"prazo": "obrigatorio", "custo": "opcional"}. Vazio = como antes.
--   * gov_planos_acao ganha prazo, onde, por que, como e custo.
-- Prioridade, "o que fazer" e "quem vai fazer" continuam sempre.
-- Pode rodar de novo.

ALTER TABLE public.gov_perguntas
  ADD COLUMN IF NOT EXISTS plano_campos jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.gov_planos_acao
  ADD COLUMN IF NOT EXISTS prazo date,
  ADD COLUMN IF NOT EXISTS onde text,
  ADD COLUMN IF NOT EXISTS por_que text,
  ADD COLUMN IF NOT EXISTS como text,
  ADD COLUMN IF NOT EXISTS custo numeric(12, 2);
