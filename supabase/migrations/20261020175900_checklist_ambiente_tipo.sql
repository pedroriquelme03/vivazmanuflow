-- Checklist vira um ambiente da equipe, ao lado de Manutenção e TI.
-- Rode este arquivo sozinho antes de 20261020180000_checklist_ambiente.sql:
-- o Postgres só deixa usar o valor novo depois que este comando termina.

ALTER TYPE public.ambiente_equipe ADD VALUE IF NOT EXISTS 'checklist';
