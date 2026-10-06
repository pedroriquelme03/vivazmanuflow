-- Admin apaga conta de teste (auth + perfil). Não apaga a própria nem o último admin.

CREATE OR REPLACE FUNCTION public.admin_apagar_usuario(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_alvo public.usuarios%ROWTYPE;
  v_outros_admins integer;
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário inválido';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode apagar a própria conta';
  END IF;

  SELECT * INTO v_alvo
  FROM public.usuarios
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  IF v_alvo.role = 'admin'::user_role THEN
    SELECT count(*)::integer INTO v_outros_admins
    FROM public.usuarios
    WHERE role = 'admin'::user_role
      AND id <> p_user_id;
    IF v_outros_admins < 1 THEN
      RAISE EXCEPTION 'Não é possível apagar o último administrador';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.demandas_predefinidas
    WHERE colaborador_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Este colaborador está em demandas pré-definidas. Troque o responsável antes de apagar.';
  END IF;

  UPDATE public.demandas
  SET
    colaborador_id = NULL,
    status = CASE
      WHEN status IN (
        'atribuida'::public.demanda_status,
        'em_andamento'::public.demanda_status
      ) THEN 'aberta'::public.demanda_status
      ELSE status
    END,
    atribuido_em = CASE
      WHEN status IN (
        'atribuida'::public.demanda_status,
        'em_andamento'::public.demanda_status
      ) THEN NULL
      ELSE atribuido_em
    END,
    iniciado_em = CASE
      WHEN status = 'em_andamento'::public.demanda_status THEN NULL
      ELSE iniciado_em
    END
  WHERE colaborador_id = p_user_id;

  UPDATE public.demanda_historico
  SET usuario_id = NULL
  WHERE usuario_id = p_user_id;

  IF to_regclass('public.demanda_mensagens') IS NOT NULL THEN
    UPDATE public.demanda_mensagens
    SET autor_id = NULL
    WHERE autor_id = p_user_id;
  END IF;

  IF to_regclass('public.requisicoes_acesso') IS NOT NULL THEN
    UPDATE public.requisicoes_acesso
    SET
      usuario_id = CASE WHEN usuario_id = p_user_id THEN NULL ELSE usuario_id END,
      resolvido_por = CASE WHEN resolvido_por = p_user_id THEN NULL ELSE resolvido_por END
    WHERE usuario_id = p_user_id OR resolvido_por = p_user_id;
  END IF;

  IF to_regclass('public.equipamento_manutencoes') IS NOT NULL THEN
    UPDATE public.equipamento_manutencoes
    SET realizado_por = NULL
    WHERE realizado_por = p_user_id;
  END IF;

  DELETE FROM public.projeto_membros WHERE usuario_id = p_user_id;
  DELETE FROM public.usuarios WHERE id = p_user_id;
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_apagar_usuario(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_apagar_usuario(uuid) TO authenticated;
