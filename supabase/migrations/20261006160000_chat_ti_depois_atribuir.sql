-- Equipe só manda mensagem depois de pegar/atribuir o chamado.
-- Realtime: replica identity para a mensagem aparecer sem reabrir a tarefa.

ALTER TABLE public.demanda_mensagens REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.equipe_enviar_mensagem(
  p_demanda_id uuid,
  p_texto text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dem public.demandas%ROWTYPE;
  v_user public.usuarios%ROWTYPE;
BEGIN
  IF p_texto IS NULL OR trim(p_texto) = '' THEN
    RAISE EXCEPTION 'Escreva a mensagem';
  END IF;

  SELECT * INTO v_user
  FROM public.usuarios
  WHERE id = auth.uid() AND ativo = true;

  IF NOT FOUND OR v_user.role NOT IN (
    'admin'::user_role,
    'lider'::user_role,
    'colaborador'::user_role
  ) THEN
    RAISE EXCEPTION 'Sem permissão para responder';
  END IF;

  SELECT * INTO v_dem
  FROM public.demandas
  WHERE id = p_demanda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  IF v_dem.ambiente IS DISTINCT FROM 'ti'::public.ambiente_equipe THEN
    RAISE EXCEPTION 'Mensagens só no chamado de TI';
  END IF;

  IF v_dem.colaborador_id IS NULL
     OR v_dem.status = 'aberta'::public.demanda_status THEN
    RAISE EXCEPTION 'Pegue ou atribua o chamado antes de mandar mensagem';
  END IF;

  INSERT INTO public.demanda_mensagens (
    demanda_id, autor, autor_id, autor_nome, texto
  ) VALUES (
    v_dem.id,
    'equipe',
    v_user.id,
    v_user.nome,
    left(trim(p_texto), 2000)
  );
END;
$$;
