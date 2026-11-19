-- Recreação dentro do Checklist (substitui a planilha "Controle_Recreacao_Vivaz").
--   1) Setor Recreação na Vivaz Cataratas (usa o que já existir com "recrea" no nome).
--   2) Checklist "Recreação - Registro de atividade": só preenchimento, sem nota
--      (não tem item Sim/Não). A atividade é uma lista suspensa; o responsável é
--      quem aplica ("para mim") ou, para o líder, alguém da lista de colaboradores.
--   3) gov_perguntas.chave: nome fixo do item para as métricas acharem a resposta
--      mesmo se o texto da pergunta for mudado no editor.
--   4) gov_ocupacao_diaria: hóspedes por dia, puxados do painel operacional
--      (operacionaldash) às 13h e às 17h. Ninguém digita.
-- Pode rodar de novo.

-- 3) Chave do item --------------------------------------------------------------------
ALTER TABLE public.gov_perguntas ADD COLUMN IF NOT EXISTS chave text;

-- 4) Ocupação do dia ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gov_ocupacao_diaria (
  data date PRIMARY KEY,
  adultos integer NOT NULL DEFAULT 0 CHECK (adultos >= 0),
  criancas integer NOT NULL DEFAULT 0 CHECK (criancas >= 0),
  -- Crianças por idade, como vem do painel: c02, c36, c710, c1112, c1317.
  criancas_faixas jsonb NOT NULL DEFAULT '{}'::jsonb,
  uhs_ocupadas integer,
  taxa_ocupacao numeric,
  -- Quando a recepção salvou no painel e quando o sistema buscou.
  atualizado_no_painel timestamptz,
  buscado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gov_ocupacao_diaria ENABLE ROW LEVEL SECURITY;

-- Lê quem usa o Checklist; grava só o servidor (chave de serviço).
DROP POLICY IF EXISTS gov_ocupacao_diaria_ler ON public.gov_ocupacao_diaria;
CREATE POLICY gov_ocupacao_diaria_ler ON public.gov_ocupacao_diaria
  FOR SELECT TO authenticated
  USING (private.governanca_papel() IS NOT NULL);

-- 1) e 2) Setor e checklist ------------------------------------------------------------
DO $$
DECLARE
  v_vivaz uuid;
  v_setor uuid;
  v_processo uuid;
  v_secao uuid;
  v_atividade uuid;
BEGIN
  SELECT id INTO v_vivaz FROM public.propriedades
  WHERE lower(btrim(nome)) = 'vivaz cataratas' LIMIT 1;
  IF v_vivaz IS NULL THEN
    RAISE EXCEPTION 'Propriedade Vivaz Cataratas não encontrada';
  END IF;

  SELECT id INTO v_setor FROM public.gov_setores
  WHERE propriedade_id = v_vivaz AND nome ILIKE '%recrea%'
  ORDER BY (lower(btrim(nome)) = 'recreação') DESC, criado_em
  LIMIT 1;
  IF v_setor IS NULL THEN
    INSERT INTO public.gov_setores (propriedade_id, nome) VALUES (v_vivaz, 'Recreação')
    RETURNING id INTO v_setor;
  END IF;

  SELECT id INTO v_processo FROM public.gov_processos
  WHERE codigo_origem = 'vivaz-recreacao-registro';
  IF v_processo IS NOT NULL THEN
    RETURN; -- Já criado: o líder edita pelo editor, o SQL não sobrescreve.
  END IF;

  INSERT INTO public.gov_processos (nome, descricao, tipo, usa_acomodacao, setor_id, codigo_origem, avaliado)
  VALUES (
    'Recreação - Registro de atividade',
    'Registro de cada atividade da recreação: o que foi feito, para qual público e quantas pessoas participaram.',
    'ambos', false, v_setor, 'vivaz-recreacao-registro', 'escolher'
  )
  RETURNING id INTO v_processo;

  INSERT INTO public.gov_secoes (processo_id, nome, ordem)
  VALUES (v_processo, 'Atividade', 1)
  RETURNING id INTO v_secao;

  INSERT INTO public.gov_perguntas (secao_id, texto, ordem, tipo, opcoes, obrigatoria, plano_acao, permite_foto, permite_comentario, chave, dica)
  VALUES (
    v_secao, 'Atividade executada', 1, 'selecao_unica',
    ARRAY[
      'Aquamania', 'Arco e flecha', 'Atividade na piscina', 'Beach tênis', 'Bingo',
      'Caça ao tesouro', 'Caminhada', 'Cataratas', 'Fogueira', 'Futebol', 'Hidroginástica',
      'Jantar do escoteiro', 'Oficina de artes', 'Pif paf', 'Piquenique', 'Quem sou eu',
      'Tempo', 'Torta na cara', 'Trilha musical', 'Trilha sensorial', 'Water ball',
      'Yoga', 'Yoga colaboradores', 'Yoga hóspedes', 'Outra (escreva em observações)'
    ]::text[],
    true, false, false, false, 'atividade',
    'Falta alguma? O líder inclui no editor do checklist.'
  )
  RETURNING id INTO v_atividade;

  INSERT INTO public.gov_perguntas (secao_id, texto, ordem, tipo, opcoes, obrigatoria, plano_acao, permite_foto, permite_comentario, chave)
  VALUES
    (v_secao, 'Hora da atividade', 2, 'hora', '{}', true, false, false, false, 'hora'),
    (v_secao, 'Público', 3, 'selecao_unica', ARRAY['Infantil', 'Adulto', 'Familiar']::text[], true, false, false, false, 'publico'),
    (v_secao, 'Número de participantes', 4, 'numero', '{}', true, false, false, false, 'participantes'),
    (v_secao, 'Observações', 5, 'texto_longo', '{}', false, false, true, false, 'observacoes');

  -- A atividade identifica o registro nas listas ("Registro de atividade · Yoga").
  UPDATE public.gov_processos SET identificador_pergunta_id = v_atividade WHERE id = v_processo;
END $$;
