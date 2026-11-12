-- Checklist: tela Equipe dentro do checklist.
--   * checklist_equipe(): quem usa o Checklist (líderes, aplicadores e admins), com os
--     setores de cada um. Só líder e administrador do checklist chamam.
--   * O líder dá e tira acesso aos setores dele (antes só o admin), para quem é do
--     Checklist e não é administrador. Ninguém mexe no próprio acesso por aqui.
--   * O login novo é criado pelo servidor do sistema (chave de serviço), que confere
--     antes: líder cria só gente do Checklist e só nos setores dele; admin, em qualquer um.
-- Precisa de 20261112160000_checklist_fase2.sql. Pode rodar de novo.

-- A pessoa usa o Checklist e não é administrador (é quem o líder pode gerenciar).
CREATE OR REPLACE FUNCTION private.gov_membro_checklist(p_usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = p_usuario_id
      AND 'checklist'::public.ambiente_equipe = ANY (u.ambientes)
      AND u.role NOT IN ('admin'::user_role, 'solicitante'::user_role)
  );
$$;

GRANT EXECUTE ON FUNCTION private.gov_membro_checklist(uuid) TO authenticated;

DROP POLICY IF EXISTS gov_usuario_setores_lider ON public.gov_usuario_setores;
CREATE POLICY gov_usuario_setores_lider ON public.gov_usuario_setores
  FOR ALL TO authenticated
  USING (
    private.governanca_papel() = 'lider'
    AND usuario_id <> auth.uid()
    AND private.gov_gerencia_setor(setor_id)
  )
  WITH CHECK (
    private.governanca_papel() = 'lider'
    AND usuario_id <> auth.uid()
    AND private.gov_gerencia_setor(setor_id)
    AND private.gov_membro_checklist(usuario_id)
  );

CREATE OR REPLACE FUNCTION public.checklist_equipe()
RETURNS TABLE (
  id uuid,
  nome text,
  email text,
  papel text,
  ambientes text[],
  ativo boolean,
  setores uuid[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.governanca_papel() IS DISTINCT FROM 'admin'
     AND private.governanca_papel() IS DISTINCT FROM 'lider' THEN
    RAISE EXCEPTION 'Apenas líder ou administrador do checklist';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.nome,
    coalesce(u.email, au.email)::text,
    CASE WHEN u.role = 'admin'::user_role THEN 'admin' ELSE coalesce(u.governanca_papel, 'camareira') END,
    u.ambientes::text[],
    u.ativo,
    coalesce(
      (SELECT array_agg(us.setor_id) FROM public.gov_usuario_setores us WHERE us.usuario_id = u.id),
      '{}'
    )
  FROM public.usuarios u
  LEFT JOIN auth.users au ON au.id = u.id
  WHERE 'checklist'::public.ambiente_equipe = ANY (u.ambientes)
    AND u.role <> 'solicitante'::user_role
  ORDER BY u.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.checklist_equipe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checklist_equipe() TO authenticated;
