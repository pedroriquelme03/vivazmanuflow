-- Plano de ação do checklist abre chamado no quadro da Manutenção.
-- O chamado nasce quando a vistoria é finalizada: enquanto ela está em
-- andamento, cada seção salva apaga e grava de novo as respostas e os planos,
-- e abrir na hora geraria chamados repetidos. Cada plano abre um chamado só
-- (fica gravado no próprio plano). Se algo falhar, a vistoria finaliza mesmo
-- assim e o plano fica sem chamado.
-- Precisa de 20261020180000_checklist_ambiente.sql e 20261104120000_qualquer_um_abre_chamado.sql.

ALTER TABLE public.gov_planos_acao
  ADD COLUMN IF NOT EXISTS demanda_id uuid REFERENCES public.demandas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chamado_token text;

CREATE OR REPLACE FUNCTION private.gov_abrir_chamados_inspecao(p_inspecao_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_insp record;
  v_plano record;
  v_usuario record;
  v_propriedade uuid;
  v_solicitante uuid;
  v_onde text;
  v_titulo text;
  v_descricao text;
  v_anexos jsonb;
  v_demanda uuid;
  v_token text;
  v_abertos integer := 0;
BEGIN
  SELECT i.id, i.inspetor_id, p.nome AS checklist, a.numero AS uh, a.tipo AS tipo_uh, c.nome AS camareira
    INTO v_insp
  FROM public.gov_inspecoes i
  JOIN public.gov_processos p ON p.id = i.processo_id
  LEFT JOIN public.gov_acomodacoes a ON a.id = i.acomodacao_id
  LEFT JOIN public.gov_camareiras c ON c.id = i.camareira_id
  WHERE i.id = p_inspecao_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Quem fez a vistoria é o solicitante do chamado.
  SELECT u.nome, u.propriedade_id INTO v_usuario
  FROM public.usuarios u
  WHERE u.id = v_insp.inspetor_id;

  v_propriedade := v_usuario.propriedade_id;
  IF v_propriedade IS NULL THEN
    SELECT pr.id INTO v_propriedade
    FROM public.propriedades pr
    WHERE pr.ativo
    ORDER BY pr.criado_em
    LIMIT 1;
  END IF;
  IF v_propriedade IS NULL OR v_usuario.nome IS NULL THEN
    RAISE WARNING 'Checklist % sem propriedade ou inspetor para abrir chamado', p_inspecao_id;
    RETURN 0;
  END IF;

  SELECT s.id INTO v_solicitante
  FROM public.solicitantes s
  WHERE s.propriedade_id = v_propriedade
    AND lower(trim(s.nome)) = lower(trim(v_usuario.nome))
  ORDER BY s.ativo DESC, s.criado_em
  LIMIT 1;
  IF v_solicitante IS NULL THEN
    INSERT INTO public.solicitantes (nome, propriedade_id)
    VALUES (trim(v_usuario.nome), v_propriedade)
    RETURNING id INTO v_solicitante;
  END IF;

  v_onde := CASE
    WHEN v_insp.uh IS NULL THEN NULL
    WHEN v_insp.tipo_uh = 'setor' THEN v_insp.uh
    ELSE 'UH ' || v_insp.uh
  END;

  FOR v_plano IN
    SELECT pa.id, pa.prioridade, pa.o_que_fazer, pa.quem_vai_fazer, pa.quem_pediu, pa.observacao,
           r.pergunta_texto, r.secao_nome, r.comentario, r.anexo_url
    FROM public.gov_planos_acao pa
    JOIN public.gov_respostas r ON r.id = pa.resposta_id
    WHERE r.inspecao_id = p_inspecao_id
      AND pa.demanda_id IS NULL
      AND pa.resolvido_em IS NULL
    ORDER BY r.secao_ordem, r.pergunta_ordem
  LOOP
    BEGIN
      v_titulo := left(
        coalesce(v_onde || ' - ', '') || trim(v_plano.o_que_fazer),
        150
      );
      v_descricao := concat_ws(E'\n',
        'Aberto pelo plano de ação do checklist "' || v_insp.checklist || '".',
        'Item reprovado: ' || v_plano.pergunta_texto,
        CASE WHEN v_plano.secao_nome IS NOT NULL THEN 'Seção: ' || v_plano.secao_nome END,
        CASE WHEN v_onde IS NOT NULL THEN 'Local: ' || v_onde END,
        CASE WHEN v_insp.camareira IS NOT NULL THEN 'Camareira: ' || v_insp.camareira END,
        'O que fazer: ' || v_plano.o_que_fazer,
        CASE WHEN v_plano.quem_vai_fazer IS NOT NULL THEN 'Quem vai fazer: ' || v_plano.quem_vai_fazer END,
        CASE WHEN v_plano.quem_pediu IS NOT NULL THEN 'Quem pediu: ' || v_plano.quem_pediu END,
        CASE WHEN v_plano.comentario IS NOT NULL THEN 'Comentário: ' || v_plano.comentario END,
        CASE WHEN v_plano.observacao IS NOT NULL THEN 'Observação: ' || v_plano.observacao END
      );
      v_anexos := CASE
        WHEN v_plano.anexo_url IS NULL THEN '[]'::jsonb
        WHEN v_plano.anexo_url ~* '\.pdf($|\?)' THEN jsonb_build_array(jsonb_build_object('url', v_plano.anexo_url, 'tipo', 'documento'))
        WHEN v_plano.anexo_url ~* '\.(mp4|mov|webm)($|\?)' THEN jsonb_build_array(jsonb_build_object('url', v_plano.anexo_url, 'tipo', 'video'))
        ELSE jsonb_build_array(jsonb_build_object('url', v_plano.anexo_url, 'tipo', 'foto'))
      END;

      SELECT a.demanda_id, a.token::text
        INTO v_demanda, v_token
      FROM public.abrir_demanda(
        p_solicitante_id => v_solicitante,
        p_titulo => v_titulo,
        p_descricao => v_descricao,
        p_prioridade => v_plano.prioridade::public.demanda_prioridade,
        p_anexos => v_anexos
      ) a;

      -- Garante o quadro da Manutenção, quem abriu e o local do chamado.
      UPDATE public.demandas
      SET ambiente = 'manutencao'::public.ambiente_equipe,
          aberto_por = coalesce(aberto_por, v_insp.inspetor_id),
          sublocal = coalesce(v_onde, sublocal)
      WHERE id = v_demanda;

      UPDATE public.gov_planos_acao
      SET demanda_id = v_demanda, chamado_token = v_token
      WHERE id = v_plano.id;

      v_abertos := v_abertos + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Plano de ação % não abriu chamado: %', v_plano.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_abertos;
END;
$$;

REVOKE ALL ON FUNCTION private.gov_abrir_chamados_inspecao(uuid) FROM PUBLIC;

-- Dispara quando a vistoria passa para finalizada.
CREATE OR REPLACE FUNCTION private.gov_inspecao_finalizada_abre_chamados()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'finalizada' AND OLD.status IS DISTINCT FROM 'finalizada' THEN
    BEGIN
      PERFORM private.gov_abrir_chamados_inspecao(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Checklist % não abriu chamados: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gov_inspecoes_abre_chamados ON public.gov_inspecoes;
CREATE TRIGGER gov_inspecoes_abre_chamados
  AFTER UPDATE OF status ON public.gov_inspecoes
  FOR EACH ROW
  EXECUTE FUNCTION private.gov_inspecao_finalizada_abre_chamados();
