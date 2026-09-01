-- Quadro da TV na sala: leitura sem login (RPC security definer).
-- Sem token de acompanhamento. Concluídas só do dia (America/Sao_Paulo).

CREATE OR REPLACE FUNCTION public.demandas_quadro_tv()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(q.item ORDER BY q.peso DESC, q.criado_em ASC),
    '[]'::jsonb
  )
  FROM (
    SELECT
      jsonb_build_object(
        'id', d.id,
        'titulo', d.titulo,
        'descricao', d.descricao,
        'prioridade', d.prioridade,
        'status', d.status,
        'criado_em', d.criado_em,
        'atribuido_em', d.atribuido_em,
        'iniciado_em', d.iniciado_em,
        'concluido_em', d.concluido_em,
        'prazo_confirmado', d.prazo_confirmado,
        'colaborador_id', d.colaborador_id,
        'propriedade_id', d.propriedade_id,
        'motivo_nao_conclusao', d.motivo_nao_conclusao,
        'peso', d.peso,
        'afeta_experiencia', d.afeta_experiencia,
        'evento_id', d.evento_id,
        'arquivado', d.arquivado,
        'sublocal', d.sublocal,
        'solicitante', CASE
          WHEN s.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', s.nome)
        END,
        'local', CASE
          WHEN l.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', l.nome)
        END,
        'propriedade', CASE
          WHEN p.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', p.nome)
        END,
        'colaborador', CASE
          WHEN u.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', u.nome)
        END,
        'evento', CASE
          WHEN e.nome IS NULL THEN NULL
          ELSE jsonb_build_object('nome', e.nome)
        END,
        'anexos', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'url', a.url,
              'tipo', a.tipo,
              'enviado_por', a.enviado_por,
              'criado_em', a.criado_em
            )
            ORDER BY a.criado_em
          )
          FROM public.demanda_anexos a
          WHERE a.demanda_id = d.id
        ), '[]'::jsonb)
      ) AS item,
      d.peso,
      d.criado_em
    FROM public.demandas d
    LEFT JOIN public.solicitantes s ON s.id = d.solicitante_id
    LEFT JOIN public.locais l ON l.id = d.local_id
    LEFT JOIN public.propriedades p ON p.id = d.propriedade_id
    LEFT JOIN public.usuarios u ON u.id = d.colaborador_id
    LEFT JOIN public.eventos e ON e.id = d.evento_id
    WHERE d.arquivado = false
      AND d.status IN (
        'aberta',
        'atribuida',
        'em_andamento',
        'aguardando_validacao',
        'concluida'
      )
      AND (
        d.status <> 'concluida'
        OR (
          (d.concluido_em AT TIME ZONE 'America/Sao_Paulo')::date
          = (timezone('America/Sao_Paulo', now()))::date
        )
      )
  ) q;
$$;

REVOKE ALL ON FUNCTION public.demandas_quadro_tv() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demandas_quadro_tv() TO anon, authenticated;
