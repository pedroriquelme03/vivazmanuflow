-- Checklist: pergunta que identifica cada aplicação (padrão do Checklist Fácil).
-- Ex.: no checklist de eventos, a pergunta "Evento" faz a inspeção aparecer como
-- "Ficha técnica · Natal". A inspeção guarda a resposta em `identificacao`, para as
-- listas e o Kanban mostrarem sem precisar ler todas as respostas.
-- Precisa de 20261112180000_checklist_patrimonio.sql. Pode rodar de novo.

ALTER TABLE public.gov_processos
  ADD COLUMN IF NOT EXISTS identificador_pergunta_id uuid REFERENCES public.gov_perguntas(id) ON DELETE SET NULL;

ALTER TABLE public.gov_inspecoes
  ADD COLUMN IF NOT EXISTS identificacao text;
