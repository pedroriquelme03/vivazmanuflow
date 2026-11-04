-- Qualquer usuário logado abre chamado de Manutenção ou de TI, sem precisar
-- fazer parte da área (usuarios.ambientes continua valendo só para trabalhar
-- no quadro/fila). Quem abriu acompanha o próprio chamado em "Meus chamados".

-- 0) "Meus chamados" filtra por aberto_por e ordena por data.
CREATE INDEX IF NOT EXISTS demandas_aberto_por_idx
  ON public.demandas (aberto_por, criado_em DESC)
  WHERE aberto_por IS NOT NULL;

-- 1) "Meus chamados": função própria em vez de uma policy nova de SELECT.
--    Uma policy permissiva em demandas valeria para TODA consulta (ex.: a
--    fila "Gerais" do colaborador passaria a mostrar o que ele abriu).
--    O detalhe do chamado continua pelo link /acompanhar/[token].
CREATE OR REPLACE FUNCTION public.meus_chamados()
RETURNS SETOF public.demandas
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.demandas
  WHERE aberto_por = auth.uid()
    AND arquivado = false
  ORDER BY criado_em DESC;
$$;

REVOKE ALL ON FUNCTION public.meus_chamados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.meus_chamados() TO authenticated;

-- 2) O formulário precisa achar (ou criar) a pessoa logada na lista de
--    solicitantes. Libera só as linhas com o próprio nome.
CREATE OR REPLACE FUNCTION private.meu_nome_normalizado()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(trim(u.nome))
  FROM public.usuarios u
  WHERE u.id = auth.uid()
    AND u.ativo = true;
$$;

REVOKE ALL ON FUNCTION private.meu_nome_normalizado() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.meu_nome_normalizado() TO authenticated;

DROP POLICY IF EXISTS "sol_sel_proprio_nome" ON public.solicitantes;
CREATE POLICY "sol_sel_proprio_nome"
  ON public.solicitantes
  FOR SELECT
  TO authenticated
  USING (lower(trim(nome)) = (SELECT private.meu_nome_normalizado()));

DROP POLICY IF EXISTS "sol_ins_proprio_nome" ON public.solicitantes;
CREATE POLICY "sol_ins_proprio_nome"
  ON public.solicitantes
  FOR INSERT
  TO authenticated
  WITH CHECK (lower(trim(nome)) = (SELECT private.meu_nome_normalizado()));

-- 3) Mandar para o quadro de TI: admin e líder (quadro) podem sempre. Os
--    demais (solicitante, colaborador, pessoal do checklist) só no chamado que
--    eles mesmos abriram e enquanto ninguém começou a trabalhar nele. Antes o
--    solicitante podia mover QUALQUER chamado. Sem prazo em minutos: o envio
--    pela fila offline pode repetir esta chamada bem depois.
CREATE OR REPLACE FUNCTION public.marcar_ambiente_demanda(
  p_demanda_id uuid,
  p_ambiente public.ambiente_equipe
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.meu_role() NOT IN (
    'admin'::user_role,
    'lider'::user_role
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.demandas
    WHERE id = p_demanda_id
      AND aberto_por = auth.uid()
      AND iniciado_em IS NULL
  ) THEN
    RAISE EXCEPTION 'Sem permissão para definir o quadro';
  END IF;

  UPDATE public.demandas
  SET
    ambiente = p_ambiente,
    colaborador_id = CASE
      WHEN p_ambiente = 'ti'::public.ambiente_equipe THEN NULL
      ELSE colaborador_id
    END,
    status = CASE
      WHEN p_ambiente = 'ti'::public.ambiente_equipe THEN 'aberta'::public.demanda_status
      ELSE status
    END,
    atribuido_em = CASE
      WHEN p_ambiente = 'ti'::public.ambiente_equipe THEN NULL
      ELSE atribuido_em
    END
  WHERE id = p_demanda_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_ambiente_demanda(uuid, public.ambiente_equipe) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_ambiente_demanda(uuid, public.ambiente_equipe)
  TO authenticated;
