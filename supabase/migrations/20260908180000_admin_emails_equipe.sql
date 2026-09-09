-- E-mails da equipe (auth.users) visíveis só para admin.

CREATE OR REPLACE FUNCTION public.admin_emails_equipe()
RETURNS TABLE (id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  RETURN QUERY
  SELECT u.id, COALESCE(au.email, '')::text
  FROM public.usuarios u
  LEFT JOIN auth.users au ON au.id = u.id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_emails_equipe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_emails_equipe() TO authenticated;
