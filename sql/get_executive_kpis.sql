-- RPC: get_executive_kpis
-- Calcula KPIs executivos (cobertura, MDV, contatos unicos, tendencias) por estrutura/distrito/setor.
-- Aplicar via Supabase SQL editor ou psql contra o banco de producao.

CREATE OR REPLACE FUNCTION public.get_executive_kpis(p_estrutura text, p_distrito text DEFAULT 'Todos'::text, p_setor text DEFAULT 'Todos'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_last_ciclo text;
    v_prev_ciclo text;
    v_context_setores integer[];
    v_kpis_context RECORD;
    v_kpis_brasil RECORD;
    v_cob_last numeric;
    v_cob_prev numeric;
    v_mdv_last numeric;
    v_mdv_prev numeric;
    v_contatos_unicos bigint;
BEGIN
    -- 1. Identificar ciclos
    SELECT ciclo INTO v_last_ciclo FROM (SELECT DISTINCT ciclo FROM public.fato_visitas ORDER BY ciclo DESC LIMIT 1) s;
    SELECT ciclo INTO v_prev_ciclo FROM (SELECT DISTINCT ciclo FROM public.fato_visitas ORDER BY ciclo DESC LIMIT 1 OFFSET 1) s;

    -- 2. Setores do contexto
    SELECT array_agg(cod_setor) INTO v_context_setores
    FROM public.dim_hierarquia
    WHERE (p_distrito = 'Todos' OR nome_distrito = p_distrito)
      AND (p_setor = 'Todos' OR cod_setor::text = p_setor OR nome_setor = p_setor);

    -- 3. Metricas Contexto
    WITH visitas_ag AS (
        SELECT ciclo, cod_setor, COUNT(DISTINCT crmuf) as vits_uniq, COUNT(*) as vits_total
        FROM public.fato_visitas
        WHERE cod_setor = ANY(v_context_setores)
        GROUP BY ciclo, cod_setor
    ),
    metas_ag AS (
        SELECT ciclo, cod_setor, SUM(tamanho_painel) as pnl, SUM(COALESCE(dias_trabalhados, 20)) as dias
        FROM public.metas_ciclo
        WHERE cod_setor = ANY(v_context_setores) AND considerar = true
        GROUP BY ciclo, cod_setor
    )
    SELECT
        SUM(va.vits_uniq) as total_vits_uniq_sum,
        SUM(va.vits_total) as total_visitas,
        SUM(ma.pnl) as total_painel,
        SUM(ma.dias) as total_dias,
        SUM(CASE WHEN va.ciclo = v_last_ciclo THEN va.vits_uniq ELSE 0 END) as last_vits_uniq,
        SUM(CASE WHEN va.ciclo = v_last_ciclo THEN va.vits_total ELSE 0 END) as last_visitas,
        SUM(CASE WHEN ma.ciclo = v_last_ciclo THEN ma.pnl ELSE 0 END) as last_pnl,
        SUM(CASE WHEN ma.ciclo = v_last_ciclo THEN ma.dias ELSE 0 END) as last_dias,
        SUM(CASE WHEN va.ciclo = v_prev_ciclo THEN va.vits_uniq ELSE 0 END) as prev_vits_uniq,
        SUM(CASE WHEN va.ciclo = v_prev_ciclo THEN va.vits_total ELSE 0 END) as prev_visitas,
        SUM(CASE WHEN ma.ciclo = v_prev_ciclo THEN ma.pnl ELSE 0 END) as prev_pnl,
        SUM(CASE WHEN ma.ciclo = v_prev_ciclo THEN ma.dias ELSE 0 END) as prev_dias
    INTO v_kpis_context
    FROM visitas_ag va
    JOIN metas_ag ma ON va.ciclo = ma.ciclo AND va.cod_setor = ma.cod_setor;

    -- 4. Metricas Brasil
    WITH visitas_br AS (
        SELECT ciclo, cod_setor, COUNT(DISTINCT crmuf) as vits_uniq, COUNT(*) as vits_total FROM public.fato_visitas GROUP BY ciclo, cod_setor
    ),
    metas_br AS (
        SELECT ciclo, cod_setor, SUM(tamanho_painel) as pnl, SUM(COALESCE(dias_trabalhados, 20)) as dias
        FROM public.metas_ciclo
        WHERE considerar = true
        GROUP BY ciclo, cod_setor
    )
    SELECT
        SUM(va.vits_uniq) as total_vits_uniq_sum,
        SUM(va.vits_total) as total_visitas,
        SUM(ma.pnl) as total_painel,
        SUM(ma.dias) as total_dias
    INTO v_kpis_brasil
    FROM visitas_br va
    JOIN metas_br ma ON va.ciclo = ma.ciclo AND va.cod_setor = ma.cod_setor;

    -- 5. Contatos Unicos - filtrando pelo ciclo atual
    SELECT COUNT(DISTINCT crmuf) INTO v_contatos_unicos
    FROM public.fato_visitas
    WHERE cod_setor = ANY(v_context_setores)
      AND ciclo = v_last_ciclo;

    v_cob_last := CASE WHEN v_kpis_context.last_pnl > 0 THEN (v_kpis_context.last_visitas::numeric / v_kpis_context.last_pnl) * 100 ELSE 0 END;
    v_cob_prev := CASE WHEN v_kpis_context.prev_pnl > 0 THEN (v_kpis_context.prev_visitas::numeric / v_kpis_context.prev_pnl) * 100 ELSE 0 END;

    v_mdv_last := CASE WHEN v_kpis_context.last_dias > 0 THEN (v_kpis_context.last_visitas::numeric / v_kpis_context.last_dias) ELSE 0 END;
    v_mdv_prev := CASE WHEN v_kpis_context.prev_dias > 0 THEN (v_kpis_context.prev_visitas::numeric / v_kpis_context.prev_dias) ELSE 0 END;

    RETURN jsonb_build_object(
        'cobertura', CASE WHEN v_kpis_context.total_painel > 0 THEN (v_kpis_context.total_visitas::numeric / v_kpis_context.total_painel) * 100 ELSE 0 END,
        'brasil_cobertura', CASE WHEN v_kpis_brasil.total_painel > 0 THEN (v_kpis_brasil.total_visitas::numeric / v_kpis_brasil.total_painel) * 100 ELSE 0 END,
        'trend_cobertura', v_cob_last - v_cob_prev,
        'mdv', CASE WHEN v_kpis_context.total_dias > 0 THEN (v_kpis_context.total_visitas::numeric / v_kpis_context.total_dias) ELSE 0 END,
        'brasil_mdv', CASE WHEN v_kpis_brasil.total_dias > 0 THEN (v_kpis_brasil.total_visitas::numeric / v_kpis_brasil.total_dias) ELSE 0 END,
        'trend_mdv', v_mdv_last - v_mdv_prev,
        'visitas_totais', v_kpis_context.last_visitas,
        'contatos_unicos', v_contatos_unicos,
        'last_ciclo', v_last_ciclo,
        'prev_ciclo', v_prev_ciclo
    );
END;
$function$;
