-- Checklist: os checklists do Aquamania deixam o setor "Geral" e vão para setores
-- de verdade, por área do parque (pelo id de origem no Checklist Fácil):
--   Manutenção ........... casas de máquinas, piscinas e produtos químicos
--   Limpeza e Resíduos ... limpeza das áreas e gerenciamento de resíduos
--   Atrações ............. segurança das atrações
--   Bilheteria e Caixa ... rotinas da bilheteria e fechamento de caixa
--   Almoxarifado ......... recebimento, armazenamento, inventário e estoque
--   A&B .................. PDVs, aproveitamento/descarte e manipuladores de alimentos
-- Na Vivaz, "Avaliação de qualidade" vai para Auditoria e Qualidade.
-- Quem acessava o "Geral" do Aquamania passa a acessar os novos setores (ajuste depois
-- em Checklist > Setores). O "Geral" vazio é removido.
-- Precisa de 20261112120000_checklist_setores.sql. Pode rodar de novo.

DO $$
DECLARE
  v_vivaz uuid;
  v_aquamania uuid;
  v_geral uuid;
BEGIN
  SELECT id INTO v_vivaz FROM public.propriedades WHERE nome ILIKE '%vivaz%' ORDER BY criado_em LIMIT 1;
  SELECT id INTO v_aquamania FROM public.propriedades WHERE nome ILIKE '%aquamania%' ORDER BY criado_em LIMIT 1;
  SELECT id INTO v_geral FROM public.gov_setores
  WHERE propriedade_id = v_aquamania AND lower(nome) = 'geral';

  -- Nome que o SQL anterior gerou com o "E" maiúsculo.
  UPDATE public.gov_setores SET nome = 'Auditoria e Qualidade'
  WHERE propriedade_id = v_vivaz AND nome = 'Auditoria E Qualidade';

  INSERT INTO public.gov_setores (propriedade_id, nome)
  VALUES
    (v_aquamania, 'Manutenção'),
    (v_aquamania, 'Limpeza e Resíduos'),
    (v_aquamania, 'Atrações'),
    (v_aquamania, 'Bilheteria e Caixa'),
    (v_aquamania, 'Almoxarifado'),
    (v_aquamania, 'A&B'),
    (v_vivaz, 'Auditoria e Qualidade')
  ON CONFLICT DO NOTHING;

  WITH destino (origem, propriedade_id, setor) AS (
    VALUES
      ('888529', v_aquamania, 'manutenção'),
      ('891306', v_aquamania, 'manutenção'),
      ('892856', v_aquamania, 'manutenção'),
      ('892862', v_aquamania, 'manutenção'),
      ('916490', v_aquamania, 'manutenção'),
      ('917512', v_aquamania, 'manutenção'),
      ('891629', v_aquamania, 'limpeza e resíduos'),
      ('892904', v_aquamania, 'limpeza e resíduos'),
      ('892933', v_aquamania, 'limpeza e resíduos'),
      ('891718', v_aquamania, 'limpeza e resíduos'),
      ('893288', v_aquamania, 'limpeza e resíduos'),
      ('891645', v_aquamania, 'atrações'),
      ('892741', v_aquamania, 'bilheteria e caixa'),
      ('894489', v_aquamania, 'bilheteria e caixa'),
      ('893324', v_aquamania, 'bilheteria e caixa'),
      ('891853', v_aquamania, 'almoxarifado'),
      ('893304', v_aquamania, 'almoxarifado'),
      ('893341', v_aquamania, 'almoxarifado'),
      ('893349', v_aquamania, 'almoxarifado'),
      ('893378', v_aquamania, 'a&b'),
      ('914471', v_aquamania, 'a&b'),
      ('893428', v_aquamania, 'a&b'),
      ('914786', v_aquamania, 'a&b'),
      ('959571', v_vivaz, 'auditoria e qualidade')
  )
  UPDATE public.gov_processos p
  SET setor_id = s.id
  FROM destino d
  JOIN public.gov_setores s ON s.propriedade_id = d.propriedade_id AND lower(s.nome) = d.setor
  WHERE p.codigo_origem = d.origem
    -- Só mexe no que ainda está em um "Geral": o que o admin já moveu fica como está.
    AND p.setor_id IN (SELECT g.id FROM public.gov_setores g WHERE lower(g.nome) = 'geral');

  IF v_geral IS NOT NULL THEN
    INSERT INTO public.gov_usuario_setores (usuario_id, setor_id)
    SELECT us.usuario_id, s.id
    FROM public.gov_usuario_setores us
    JOIN public.gov_setores s ON s.propriedade_id = v_aquamania AND s.id <> v_geral
    WHERE us.setor_id = v_geral
    ON CONFLICT DO NOTHING;

    DELETE FROM public.gov_setores g
    WHERE g.id = v_geral
      AND NOT EXISTS (SELECT 1 FROM public.gov_processos WHERE setor_id = g.id)
      AND NOT EXISTS (SELECT 1 FROM public.gov_camareiras WHERE setor_id = g.id);
  END IF;
END;
$$;

-- Confere: checklists por setor depois da separação.
SELECT pr.nome AS propriedade, s.nome AS setor, count(p.id) AS checklists
FROM public.gov_setores s
JOIN public.propriedades pr ON pr.id = s.propriedade_id
LEFT JOIN public.gov_processos p ON p.setor_id = s.id
GROUP BY pr.nome, s.nome
ORDER BY pr.nome, s.nome;
