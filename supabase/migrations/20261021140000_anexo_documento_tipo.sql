-- Anexo em PDF nos chamados.
-- Rode este arquivo sozinho antes de 20261021140100_anexo_documento.sql:
-- o Postgres só deixa usar o valor novo depois que este comando termina.

ALTER TYPE public.anexo_tipo ADD VALUE IF NOT EXISTS 'documento';
