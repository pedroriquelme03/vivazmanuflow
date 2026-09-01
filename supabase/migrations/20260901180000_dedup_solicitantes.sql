-- Só remove o trigger de clone, se alguém chegou a aplicar a versão antiga.
-- Não apaga solicitantes nem cria índice único (dois “João” no mesmo local
-- são válidos; o índice quebraria isso).

DROP TRIGGER IF EXISTS usuarios_gestor_solicitante ON public.usuarios;
DROP FUNCTION IF EXISTS private.usuarios_gestor_solicitante();
DROP FUNCTION IF EXISTS private.garantir_solicitantes_gestor(text, uuid);
