-- Checklist: quem é avaliado, escolhido em cada checklist.
--   * gov_processos.avaliado:
--       'colaborador' — o líder escolhe o colaborador da lista (Governança, como já era);
--       'proprio'     — quem aplica é o avaliado (aplica para si mesmo, com a conta dele);
--       'escolher'    — no começo o líder escolhe "para mim" ou "para outra pessoa";
--                       o aplicador faz sempre para ele mesmo.
--   * O colaborador pode ter login (gov_camareiras.usuario_id): "para mim" usa o
--     colaborador ligado à conta de quem aplica, criado na primeira vez (nunca liga
--     pelo nome, para ninguém virar outra pessoa por ter o mesmo nome).
--   * Segurança: quem não cuida do setor (aplicador) só consegue gravar a si mesmo como
--     avaliado; no modo 'proprio', só quem aplica, e não finaliza sem avaliado.
--   * Os checklists dos setores de Manutenção começam em 'escolher'.
-- Precisa de 20261112210000_checklist_equipe.sql. Pode rodar de novo.

ALTER TABLE public.gov_processos
  ADD COLUMN IF NOT EXISTS avaliado text NOT NULL DEFAULT 'colaborador';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gov_processos_avaliado_check') THEN
    ALTER TABLE public.gov_processos
      ADD CONSTRAINT gov_processos_avaliado_check CHECK (avaliado IN ('colaborador', 'proprio', 'escolher'));
    -- Primeira vez: Manutenção aplica para si (o líder ainda pode escolher outra pessoa).
    UPDATE public.gov_processos p
    SET avaliado = 'escolher'
    FROM public.gov_setores s
    WHERE s.id = p.setor_id AND s.nome ILIKE 'manuten%';
  END IF;
END $$;

ALTER TABLE public.gov_camareiras
  ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS gov_camareiras_usuario_setor_unico
  ON public.gov_camareiras (setor_id, usuario_id)
  WHERE usuario_id IS NOT NULL;

-- Versão antiga (por setor), caso tenha sido criada em teste.
DROP FUNCTION IF EXISTS public.gov_meu_colaborador(uuid);

-- O colaborador de quem está logado no setor do checklist; cria na primeira vez.
-- Só para checklist em que a pessoa aplica para si ('proprio' ou 'escolher').
CREATE OR REPLACE FUNCTION public.gov_meu_colaborador_no_checklist(p_processo_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_setor uuid;
  v_id uuid;
  v_nome text;
BEGIN
  SELECT p.setor_id INTO v_setor
  FROM public.gov_processos p
  JOIN public.gov_setores s ON s.id = p.setor_id AND s.ativo
  WHERE p.id = p_processo_id
    AND p.ativo
    AND p.avaliado IN ('proprio', 'escolher');

  IF auth.uid() IS NULL OR v_setor IS NULL OR NOT private.gov_ve_processo(p_processo_id) THEN
    RAISE EXCEPTION 'Este checklist não é aplicado para si mesmo';
  END IF;

  SELECT id INTO v_id
  FROM public.gov_camareiras
  WHERE setor_id = v_setor AND usuario_id = auth.uid()
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT nome INTO v_nome FROM public.usuarios WHERE id = auth.uid() AND ativo;
  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Usuário inativo';
  END IF;

  INSERT INTO public.gov_camareiras (nome, setor_id, usuario_id, ativo)
  VALUES (v_nome, v_setor, auth.uid(), true)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.gov_meu_colaborador_no_checklist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gov_meu_colaborador_no_checklist(uuid) TO authenticated;

-- Criar inspeção: além de líder/admin, o aplicador pode pôr a si mesmo como avaliado.
DROP POLICY IF EXISTS gov_inspecoes_criar ON public.gov_inspecoes;
CREATE POLICY gov_inspecoes_criar ON public.gov_inspecoes
  FOR INSERT TO authenticated
  WITH CHECK (
    inspetor_id = auth.uid()
    AND status = 'em_andamento'
    AND private.gov_ve_processo(processo_id)
    AND (
      camareira_id IS NULL
      OR private.governanca_papel() IN ('admin', 'lider')
      OR EXISTS (
        SELECT 1 FROM public.gov_camareiras c
        WHERE c.id = camareira_id AND c.usuario_id = auth.uid()
      )
    )
  );

-- Ninguém grava outra pessoa como avaliada sem poder.
CREATE OR REPLACE FUNCTION private.gov_inspecao_avaliado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modo text;
  v_setor uuid;
  v_dono uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.camareira_id IS NOT DISTINCT FROM OLD.camareira_id
     AND NEW.processo_id IS NOT DISTINCT FROM OLD.processo_id
     AND NEW.inspetor_id IS NOT DISTINCT FROM OLD.inspetor_id
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT p.avaliado, p.setor_id INTO v_modo, v_setor
  FROM public.gov_processos p WHERE p.id = NEW.processo_id;

  IF NEW.camareira_id IS NULL THEN
    IF v_modo = 'proprio' AND NEW.status = 'finalizada' THEN
      RAISE EXCEPTION 'Neste checklist o avaliado é quem aplica.';
    END IF;
    RETURN NEW;
  END IF;

  SELECT c.usuario_id INTO v_dono
  FROM public.gov_camareiras c WHERE c.id = NEW.camareira_id;

  IF v_modo = 'proprio' AND v_dono IS DISTINCT FROM NEW.inspetor_id THEN
    RAISE EXCEPTION 'Neste checklist o avaliado é quem aplica.';
  END IF;

  -- Chave de serviço (sem usuário) passa; aplicador só a si mesmo.
  IF auth.uid() IS NOT NULL
     AND NOT private.gov_gerencia_setor(v_setor)
     AND v_dono IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Você só pode aplicar este checklist para você mesmo.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gov_inspecoes_avaliado ON public.gov_inspecoes;
CREATE TRIGGER gov_inspecoes_avaliado
  BEFORE INSERT OR UPDATE OF camareira_id, processo_id, inspetor_id, status ON public.gov_inspecoes
  FOR EACH ROW EXECUTE FUNCTION private.gov_inspecao_avaliado();
