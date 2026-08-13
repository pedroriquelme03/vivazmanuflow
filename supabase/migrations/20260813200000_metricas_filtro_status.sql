-- Relatórios: filtro por status (colunas do quadro) e arquivado.

DROP FUNCTION IF EXISTS public.metricas(
  timestamptz, timestamptz, uuid, uuid, uuid, uuid,
  public.demanda_prioridade, uuid, boolean
);

DROP FUNCTION IF EXISTS public.metricas(
  timestamptz, timestamptz, uuid, uuid, uuid, uuid,
  public.demanda_prioridade, uuid, boolean,
  public.demanda_status, boolean
);

CREATE OR REPLACE FUNCTION public.metricas(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_colaborador_id uuid DEFAULT NULL,
  p_setor_id uuid DEFAULT NULL,
  p_propriedade_id uuid DEFAULT NULL,
  p_local_id uuid DEFAULT NULL,
  p_prioridade public.demanda_prioridade DEFAULT NULL,
  p_evento_id uuid DEFAULT NULL,
  p_somente_eventos boolean DEFAULT NULL,
  p_status public.demanda_status DEFAULT NULL,
  p_arquivado boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH base AS (
    SELECT
      d.*,
      l.nome AS local_nome,
      s.nome AS setor_nome,
      u.nome AS colaborador_nome,
      sol.setor_id AS solicitante_setor_id
    FROM public.demandas d
    LEFT JOIN public.locais l ON l.id = d.local_id
    LEFT JOIN public.solicitantes sol ON sol.id = d.solicitante_id
    LEFT JOIN public.setores s ON s.id = COALESCE(l.setor_id, sol.setor_id)
    LEFT JOIN public.usuarios u ON u.id = d.colaborador_id
    WHERE d.criado_em >= p_inicio
      AND d.criado_em < p_fim
      AND (p_colaborador_id IS NULL OR d.colaborador_id = p_colaborador_id)
      AND (p_propriedade_id IS NULL OR d.propriedade_id = p_propriedade_id)
      AND (p_local_id IS NULL OR d.local_id = p_local_id)
      AND (p_prioridade IS NULL OR d.prioridade = p_prioridade)
      AND (p_evento_id IS NULL OR d.evento_id = p_evento_id)
      AND (
        p_somente_eventos IS NULL
        OR (p_somente_eventos = true AND d.evento_id IS NOT NULL)
        OR (p_somente_eventos = false AND d.evento_id IS NULL)
      )
      AND (
        p_setor_id IS NULL
        OR COALESCE(l.setor_id, sol.setor_id) = p_setor_id
      )
      AND (p_status IS NULL OR d.status = p_status)
      AND (
        p_arquivado IS NULL
        OR COALESCE(d.arquivado, false) = p_arquivado
      )
  ),
  kpis AS (
    SELECT
      COUNT(*)::int AS total_criadas,
      COUNT(*) FILTER (WHERE status = 'concluida')::int AS concluidas,
      COUNT(*) FILTER (
        WHERE status IN ('aberta', 'atribuida', 'em_andamento', 'aguardando_validacao')
      )::int AS abertas_agora,
      COUNT(*) FILTER (WHERE status = 'cancelada')::int AS canceladas,
      ROUND(
        AVG(
          EXTRACT(EPOCH FROM (concluido_em - COALESCE(iniciado_em, atribuido_em))) / 60.0
        ) FILTER (
          WHERE status = 'concluida'
            AND concluido_em IS NOT NULL
            AND COALESCE(iniciado_em, atribuido_em) IS NOT NULL
        )
      )::int AS tempo_medio_min,
      COUNT(*) FILTER (
        WHERE status = 'concluida'
          AND prazo_confirmado IS NOT NULL
          AND concluido_em IS NOT NULL
      )::int AS sla_total,
      COUNT(*) FILTER (
        WHERE status = 'concluida'
          AND prazo_confirmado IS NOT NULL
          AND concluido_em IS NOT NULL
          AND concluido_em <= prazo_confirmado
      )::int AS sla_cumprido
    FROM base
  ),
  por_prio AS (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS j
    FROM (
      SELECT
        prioridade::text AS prioridade,
        COUNT(*)::int AS total,
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (concluido_em - COALESCE(iniciado_em, atribuido_em))) / 60.0
          ) FILTER (
            WHERE status = 'concluida'
              AND concluido_em IS NOT NULL
              AND COALESCE(iniciado_em, atribuido_em) IS NOT NULL
          )
        )::int AS tempo_medio_min
      FROM base
      GROUP BY prioridade
      ORDER BY
        CASE prioridade
          WHEN 'alta' THEN 1
          WHEN 'media' THEN 2
          ELSE 3
        END
    ) t
  ),
  por_setor AS (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS j
    FROM (
      SELECT COALESCE(setor_nome, 'Sem setor') AS setor, COUNT(*)::int AS total
      FROM base
      GROUP BY COALESCE(setor_nome, 'Sem setor')
      ORDER BY total DESC
      LIMIT 12
    ) t
  ),
  por_local AS (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS j
    FROM (
      SELECT COALESCE(local_nome, 'Sem local') AS local, COUNT(*)::int AS total
      FROM base
      GROUP BY COALESCE(local_nome, 'Sem local')
      ORDER BY total DESC
      LIMIT 8
    ) t
  ),
  ranking AS (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS j
    FROM (
      SELECT
        COALESCE(colaborador_nome, 'Sem responsável') AS nome,
        COUNT(*)::int AS total,
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (concluido_em - COALESCE(iniciado_em, atribuido_em))) / 60.0
          ) FILTER (
            WHERE concluido_em IS NOT NULL
              AND COALESCE(iniciado_em, atribuido_em) IS NOT NULL
          )
        )::int AS tempo_medio_min,
        CASE
          WHEN COUNT(*) FILTER (WHERE prazo_confirmado IS NOT NULL AND concluido_em IS NOT NULL) = 0
            THEN NULL
          ELSE ROUND(
            100.0 * COUNT(*) FILTER (
              WHERE prazo_confirmado IS NOT NULL
                AND concluido_em IS NOT NULL
                AND concluido_em <= prazo_confirmado
            )
            / COUNT(*) FILTER (WHERE prazo_confirmado IS NOT NULL AND concluido_em IS NOT NULL)
          )::int
        END AS pct_prazo
      FROM base
      WHERE status = 'concluida' AND colaborador_id IS NOT NULL
      GROUP BY colaborador_id, colaborador_nome
      ORDER BY total DESC, nome
      LIMIT 20
    ) t
  ),
  por_hora AS (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS j
    FROM (
      SELECT
        EXTRACT(HOUR FROM criado_em AT TIME ZONE 'America/Sao_Paulo')::int AS hora,
        COUNT(*)::int AS total
      FROM base
      GROUP BY 1
      ORDER BY 1
    ) t
  ),
  por_dow AS (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS j
    FROM (
      SELECT
        EXTRACT(DOW FROM criado_em AT TIME ZONE 'America/Sao_Paulo')::int AS dow,
        COUNT(*)::int AS total
      FROM base
      GROUP BY 1
      ORDER BY 1
    ) t
  )
  SELECT json_build_object(
    'total_criadas', k.total_criadas,
    'concluidas', k.concluidas,
    'abertas_agora', k.abertas_agora,
    'canceladas', k.canceladas,
    'tempo_medio_min', k.tempo_medio_min,
    'sla_total', k.sla_total,
    'sla_cumprido', k.sla_cumprido,
    'por_prioridade', pp.j,
    'por_setor', ps.j,
    'por_local', pl.j,
    'ranking', r.j,
    'por_hora', ph.j,
    'por_dia_semana', pd.j
  )
  INTO result
  FROM kpis k, por_prio pp, por_setor ps, por_local pl, ranking r, por_hora ph, por_dow pd;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.metricas(
  timestamptz, timestamptz, uuid, uuid, uuid, uuid,
  public.demanda_prioridade, uuid, boolean,
  public.demanda_status, boolean
) TO authenticated;
