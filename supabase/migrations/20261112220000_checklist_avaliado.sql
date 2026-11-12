-- Checklist: quem é avaliado, escolhido em cada checklist.
--   * gov_processos.avaliado:
--       'colaborador' — o líder escolhe o colaborador da lista (Governança, como já era);
--       'proprio'     — quem aplica é o avaliado (aplica para si mesmo, com a conta dele);
--       'escolher'    — no começo o líder escolhe "para mim" ou "para outra pessoa";
--                       o aplicador faz sempre para ele mesmo.
--   * O colaborador pode ter login (gov_camareiras.usuario_id): "para mim" usa o
--     colaborador ligado à conta de quem aplica, criado na primeira vez.
--   * Segurança: quem não cuida do setor (aplicador) só consegue gravar a si mesmo como
--     avaliado; no modo 'proprio', só quem aplica. Escolher o nome de outro não passa.
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

-- O colaborador de quem está logado neste setor; cria (ou liga pelo nome) na primeira vez.
CREATE OR REPLACE FUNCTION public.gov_meu_colaborador(p_setor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_nome text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.gov_ve_setor(p_setor_id) THEN
    RAISE EXCEPTION 'Sem acesso a este setor';
  END IF;

  SELECT id INTO v_id
  FROM public.gov_camareiras
  WHERE setor_id = p_setor_id AND usuario_id = auth.uid()
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT nome INTO v_nome FROM public.usuarios WHERE id = auth.uid();

  -- Já cadastrado como colaborador sem login, com o mesmo nome: liga à conta.
  SELECT id INTO v_id
  FROM public.gov_camareiras
  WHERE setor_id = p_setor_id
    AND usuario_id IS NULL
    AND lower(btrim(nome)) = lower(btrim(v_nome))
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.gov_camareiras SET usuario_id = auth.uid() WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.gov_camareiras (nome, setor_id, usuario_id, ativo)
  VALUES (v_nome, p_setor_id, auth.uid(), true)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.gov_meu_colaborador(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gov_meu_colaborador(uuid) TO authenticated;

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
  IF NEW.camareira_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.camareira_id IS NOT DISTINCT FROM OLD.camareira_id THEN
    RETURN NEW;
  END IF;

  SELECT p.avaliado, p.setor_id INTO v_modo, v_setor
  FROM public.gov_processos p WHERE p.id = NEW.processo_id;
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
  BEFORE INSERT OR UPDATE OF camareira_id ON public.gov_inspecoes
  FOR EACH ROW EXECUTE FUNCTION private.gov_inspecao_avaliado();
