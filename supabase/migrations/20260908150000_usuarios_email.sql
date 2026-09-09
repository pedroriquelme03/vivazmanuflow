-- E-mail visível na lista de equipe (Cadastros).

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS email text;

-- Preenche e-mails já existentes a partir do Auth
UPDATE public.usuarios u
SET email = a.email
FROM auth.users a
WHERE a.id = u.id
  AND (u.email IS NULL OR trim(u.email) = '');

CREATE OR REPLACE FUNCTION public.sync_usuario_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    SELECT a.email INTO NEW.email
    FROM auth.users a
    WHERE a.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usuarios_sync_email ON public.usuarios;
CREATE TRIGGER usuarios_sync_email
  BEFORE INSERT OR UPDATE OF email ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_usuario_email();
