-- Checklist: cada pergunta diz se aceita comentário e foto (padrão do Checklist Fácil,
-- onde dá para desligar os dois por item). Ligado continua igual a hoje.
-- Se a pergunta exige foto ou comentário em alguma resposta, o preenchimento mostra
-- mesmo assim (a regra de obrigatório vence).
-- Pode rodar de novo.

ALTER TABLE public.gov_perguntas
  ADD COLUMN IF NOT EXISTS permite_comentario boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS permite_foto boolean NOT NULL DEFAULT true;
