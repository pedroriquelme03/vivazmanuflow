-- Pool "Demandas Gerais" visível para colaboradores.
--
-- A única política de SELECT existente (dem_sel_staff) libera leitura ampla só
-- para gestores; o colaborador enxerga apenas as demandas atribuídas a ele.
-- Isso deixava o pool (colaborador_id IS NULL) invisível para o colaborador,
-- então a aba "Demandas Gerais" ficava sempre vazia.
--
-- Esta política é PERMISSIVA e se combina via OR com as demais: adiciona ao
-- colaborador o direito de LER as demandas abertas e sem responsável, de
-- qualquer local (pool compartilhado por todos os colaboradores).

DROP POLICY IF EXISTS "dem_sel_pool_colab" ON public.demandas;
CREATE POLICY "dem_sel_pool_colab"
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (
    status = 'aberta'
    AND colaborador_id IS NULL
    AND private.meu_role() = 'colaborador'::user_role
  );
