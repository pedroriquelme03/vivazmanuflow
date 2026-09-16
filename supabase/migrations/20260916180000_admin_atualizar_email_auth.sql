-- E-mail da equipe: lista (usuarios) e login (auth) precisam ficar iguais.
-- Trigger de sync só no INSERT. Auth: identity_data; provider_id só se já for e-mail.

DROP TRIGGER IF EXISTS usuarios_sync_email ON public.usuarios;
CREATE TRIGGER usuarios_sync_email
  BEFORE INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_usuario_email();

CREATE OR REPLACE FUNCTION public.admin_atualizar_usuario(
  p_user_id uuid,
  p_nome text,
  p_email text,
  p_ativo boolean,
  p_propriedade_id uuid DEFAULT NULL,
  p_senha text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_nome text := nullif(trim(p_nome), '');
  v_email text := lower(trim(p_email));
  v_senha text := nullif(trim(p_senha), '');
  v_auth_n integer;
  v_id_n integer;
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Informe o nome';
  END IF;

  IF v_email IS NULL OR position('@' IN v_email) < 2
     OR position('@' IN v_email) = length(v_email) THEN
    RAISE EXCEPTION 'Informe um e-mail válido';
  END IF;

  IF v_senha IS NOT NULL AND length(v_senha) < 6 THEN
    RAISE EXCEPTION 'A senha deve ter no mínimo 6 caracteres';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(email) = v_email AND id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Este e-mail já está em uso';
  END IF;

  UPDATE public.usuarios
  SET
    nome = v_nome,
    email = v_email,
    ativo = p_ativo,
    propriedade_id = p_propriedade_id,
    atualizado_em = now()
  WHERE id = p_user_id;

  UPDATE auth.users
  SET
    email = v_email,
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      to_jsonb(v_email)
    ),
    updated_at = now(),
    encrypted_password = CASE
      WHEN v_senha IS NOT NULL THEN crypt(v_senha, gen_salt('bf'))
      ELSE encrypted_password
    END
  WHERE id = p_user_id;

  GET DIAGNOSTICS v_auth_n = ROW_COUNT;
  IF v_auth_n <> 1 THEN
    RAISE EXCEPTION 'Não foi possível atualizar o e-mail de login';
  END IF;

  UPDATE auth.identities
  SET
    identity_data = jsonb_set(
      COALESCE(identity_data, '{}'::jsonb),
      '{email}',
      to_jsonb(v_email)
    ),
    provider_id = CASE
      WHEN provider_id LIKE '%@%' THEN v_email
      ELSE provider_id
    END,
    updated_at = now()
  WHERE user_id = p_user_id
    AND provider = 'email';

  GET DIAGNOSTICS v_id_n = ROW_COUNT;
  IF v_id_n < 1 THEN
    RAISE EXCEPTION 'Não foi possível atualizar a identidade de login';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_atualizar_usuario(uuid, text, text, boolean, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_usuario(uuid, text, text, boolean, uuid, text) TO authenticated;
