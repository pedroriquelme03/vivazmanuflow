-- Checklist: a Equipe que o líder enxerga fica restrita.
--   * O líder vê só quem divide algum setor com ele, mais quem ainda não tem setor
--     (para poder dar acesso). Administradores e e-mails de outros setores não aparecem.
--   * O administrador continua vendo todo mundo.
-- Precisa de 20261112210000_checklist_equipe.sql. Pode rodar de novo.

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
DECLARE
  v_papel text := private.governanca_papel();
BEGIN
  IF v_papel IS DISTINCT FROM 'admin' AND v_papel IS DISTINCT FROM 'lider' THEN
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
    AND (
      v_papel = 'admin'
      OR (
        u.role <> 'admin'::user_role
        AND (
          u.id = auth.uid()
          OR NOT EXISTS (SELECT 1 FROM public.gov_usuario_setores x WHERE x.usuario_id = u.id)
          OR EXISTS (
            SELECT 1
            FROM public.gov_usuario_setores dele
            JOIN public.gov_usuario_setores meu ON meu.setor_id = dele.setor_id AND meu.usuario_id = auth.uid()
            WHERE dele.usuario_id = u.id
          )
        )
      )
    )
  ORDER BY u.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.checklist_equipe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checklist_equipe() TO authenticated;
