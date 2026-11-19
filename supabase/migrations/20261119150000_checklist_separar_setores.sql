-- Cada setor vê só o que é dele.
-- Inspeções, respostas, checklists e colaboradores já eram separados por setor.
-- Faltava:
--   1) Relatório diário (lista de UHs para limpeza do dia): era aberto a todo
--      mundo do Checklist (ex.: a Segurança da Aquamania via). Agora só quem é do
--      setor Governança vê e marca; só o líder da Governança (e o admin) envia.
--   2) Ocupação do dia (Recreação): só o admin e o líder da Recreação leem.
-- Precisa de 20261106120000_relatorio_diario.sql e 20261119130000_recreacao.sql.
-- Pode rodar de novo.

-- Quem é do setor Governança (admin sempre).
CREATE OR REPLACE FUNCTION private.gov_ve_governanca()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gov_setores s
    WHERE lower(btrim(s.nome)) IN ('governança', 'governanca')
      AND private.gov_ve_setor(s.id)
  );
$$;

-- Quem cuida do setor Governança: admin ou líder marcado nele.
CREATE OR REPLACE FUNCTION private.gov_gerencia_governanca()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gov_setores s
    WHERE lower(btrim(s.nome)) IN ('governança', 'governanca')
      AND private.gov_gerencia_setor(s.id)
  );
$$;

REVOKE ALL ON FUNCTION private.gov_ve_governanca() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.gov_gerencia_governanca() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.gov_ve_governanca() TO authenticated;
GRANT EXECUTE ON FUNCTION private.gov_gerencia_governanca() TO authenticated;

-- 1) Relatório diário ------------------------------------------------------------------
DROP POLICY IF EXISTS gov_relatorios_diarios_ler ON public.gov_relatorios_diarios;
CREATE POLICY gov_relatorios_diarios_ler ON public.gov_relatorios_diarios
  FOR SELECT TO authenticated
  USING (private.gov_ve_governanca());

DROP POLICY IF EXISTS gov_relatorio_uhs_ler ON public.gov_relatorio_uhs;
CREATE POLICY gov_relatorio_uhs_ler ON public.gov_relatorio_uhs
  FOR SELECT TO authenticated
  USING (private.gov_ve_governanca());

DROP POLICY IF EXISTS gov_relatorios_diarios_equipe ON public.gov_relatorios_diarios;
CREATE POLICY gov_relatorios_diarios_equipe ON public.gov_relatorios_diarios
  FOR ALL TO authenticated
  USING (private.gov_gerencia_governanca())
  WITH CHECK (private.gov_gerencia_governanca());

DROP POLICY IF EXISTS gov_relatorio_uhs_equipe ON public.gov_relatorio_uhs;
CREATE POLICY gov_relatorio_uhs_equipe ON public.gov_relatorio_uhs
  FOR ALL TO authenticated
  USING (private.gov_gerencia_governanca())
  WITH CHECK (private.gov_gerencia_governanca());

-- A camareira marca a UH como feita: só quem é da Governança.
CREATE OR REPLACE FUNCTION public.gov_marcar_uh_relatorio(p_id uuid, p_feita boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.gov_ve_governanca() THEN
    RAISE EXCEPTION 'O relatório diário é só do setor Governança';
  END IF;
  UPDATE public.gov_relatorio_uhs
  SET feita_em = CASE WHEN p_feita THEN now() ELSE NULL END,
      feita_por = CASE WHEN p_feita THEN auth.uid() ELSE NULL END
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.gov_marcar_uh_relatorio(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gov_marcar_uh_relatorio(uuid, boolean) TO authenticated;

-- 2) Ocupação do dia: admin e líder da Recreação --------------------------------------
DROP POLICY IF EXISTS gov_ocupacao_diaria_ler ON public.gov_ocupacao_diaria;
CREATE POLICY gov_ocupacao_diaria_ler ON public.gov_ocupacao_diaria
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gov_processos p
      WHERE p.codigo_origem = 'vivaz-recreacao-registro'
        AND private.gov_gerencia_setor(p.setor_id)
    )
  );
