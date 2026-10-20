-- Checklists além das UHs: o checklist pode não pedir acomodação e cada item
-- tem um tipo (Sim/Não, carinhas, texto, número, data, hora, listas).
-- Tudo aditivo: o que já existe continua como Sim/Não com UH.

ALTER TABLE public.gov_processos
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS usa_acomodacao boolean NOT NULL DEFAULT true,
  -- Id do checklist no sistema de onde ele foi importado.
  ADD COLUMN IF NOT EXISTS codigo_origem text UNIQUE;

ALTER TABLE public.gov_perguntas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'sim_nao'
    CHECK (tipo IN (
      'sim_nao', 'carinhas', 'texto_curto', 'texto_longo', 'numero', 'decimal',
      'porcentagem', 'data', 'mes_ano', 'hora', 'selecao_unica', 'selecao_multipla'
    )),
  ADD COLUMN IF NOT EXISTS opcoes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS permite_na boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS obrigatoria boolean NOT NULL DEFAULT true,
  -- "Não" abre plano de ação (só vale para Sim/Não).
  ADD COLUMN IF NOT EXISTS plano_acao boolean NOT NULL DEFAULT true,
  -- Subárea dentro da seção (ex.: "Bombas › Bomba 1").
  ADD COLUMN IF NOT EXISTS grupo text,
  ADD COLUMN IF NOT EXISTS dica text;

ALTER TABLE public.gov_inspecoes
  ALTER COLUMN acomodacao_id DROP NOT NULL,
  ALTER COLUMN tipo DROP NOT NULL;

ALTER TABLE public.gov_respostas
  DROP CONSTRAINT IF EXISTS gov_respostas_resposta_check;

ALTER TABLE public.gov_respostas
  ADD CONSTRAINT gov_respostas_resposta_check
  CHECK (resposta IN ('sim', 'nao', 'na'));

ALTER TABLE public.gov_respostas
  ADD COLUMN IF NOT EXISTS pergunta_tipo text NOT NULL DEFAULT 'sim_nao',
  ADD COLUMN IF NOT EXISTS pergunta_grupo text,
  -- Resposta dos itens que não são Sim/Não (texto, número, data, opções...).
  ADD COLUMN IF NOT EXISTS valor text;

CREATE INDEX IF NOT EXISTS gov_inspecoes_processo_idx ON public.gov_inspecoes (processo_id);
