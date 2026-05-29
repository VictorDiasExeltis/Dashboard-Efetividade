-- RPC: get_executive_kpis
-- Calcula KPIs executivos (cobertura, MDV, contatos unicos, tendencias) por
-- estrutura/distrito/setor e janela de ciclos.
--
-- Param p_ciclos (text, CSV):
--   NULL / vazio  -> usa apenas o ultimo ciclo disponivel (comportamento default)
--   "202604"      -> agrega os KPIs no ciclo informado
--   "202604,202605" -> agrega sobre os ciclos informados; trend e calculado
--                    contra o ciclo imediatamente anterior ao MIN dos selecionados.
-- CSV escolhido para evitar problemas de marshaling JS array -> text[] em
-- drivers como postgres-js (que achata arrays unitarios em escalar).
-- Aplicar via Supabase SQL editor ou psql contra o banco de producao.

CREATE OR REPLACE FUNCTION public.get_executive_kpis(
    p_estrutura text,
    p_distrito text DEFAULT 'Todos'::text,
    p_setor text DEFAULT 'Todos'::text,
    p_ciclos text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_last_ciclo text;
    v_prev_ciclo text;
    v_ciclos_sel text[];
    v_ciclos_prev text[];
    v_context_setores integer[];
    v_kpis_context RECORD;
    v_kpis_brasil RECORD;
    v_cob_last numeric;
    v_cob_prev numeric;
    v_mdv_last numeric;
    v_mdv_prev numeric;
    v_contatos_unicos bigint;
    v_contatos_unicos_prev bigint;
    v_visitas_totais bigint;
    v_visitas_totais_prev bigint;
BEGIN
    -- 1. Ultimo ciclo do banco (sempre, pra metadata)
    SELECT ciclo INTO v_last_ciclo
    FROM (SELECT DISTINCT ciclo FROM public.fato_visitas ORDER BY ciclo DESC LIMIT 1) s;

    -- 2. Janela selecionada e janela de comparacao (trend). p_ciclos chega
    -- como CSV ("202604,202605") ou NULL/vazio.
    IF p_ciclos IS NULL OR btrim(p_ciclos) = '' THEN
        -- Sem filtro: KPIs reportam apenas o ultimo ciclo
        v_ciclos_sel := ARRAY[v_last_ciclo];
        SELECT ciclo INTO v_prev_ciclo
        FROM (SELECT DISTINCT ciclo FROM public.fato_visitas ORDER BY ciclo DESC LIMIT 1 OFFSET 1) s;
    ELSE
        SELECT array_agg(btrim(c)) INTO v_ciclos_sel
        FROM unnest(string_to_array(p_ciclos, ',')) c
        WHERE btrim(c) <> '';
        -- Trend vs ciclo imediatamente anterior ao MIN(selecao)
        SELECT ciclo INTO v_prev_ciclo
        FROM (
            SELECT DISTINCT ciclo FROM public.fato_visitas
            WHERE ciclo < (SELECT MIN(c) FROM unnest(v_ciclos_sel) c)
            ORDER BY ciclo DESC LIMIT 1
        ) s;
    END IF;

    IF v_prev_ciclo IS NULL THEN
        v_ciclos_prev := ARRAY[]::text[];
    ELSE
        v_ciclos_prev := ARRAY[v_prev_ciclo];
    END IF;

    -- 3. Setores do contexto
    SELECT array_agg(cod_setor) INTO v_context_setores
    FROM public.dim_hierarquia
    WHERE (p_distrito = 'Todos' OR nome_distrito = p_distrito)
      AND (p_setor = 'Todos' OR cod_setor::text = p_setor OR nome_setor = p_setor);

    -- 4. Metricas Contexto - agregadas sobre v_ciclos_sel (selected) e
    -- v_ciclos_prev (para trend).
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
        SUM(CASE WHEN va.ciclo = ANY(v_ciclos_sel) THEN va.vits_uniq ELSE 0 END) as last_vits_uniq,
        SUM(CASE WHEN va.ciclo = ANY(v_ciclos_sel) THEN va.vits_total ELSE 0 END) as last_visitas,
        SUM(CASE WHEN ma.ciclo = ANY(v_ciclos_sel) THEN ma.pnl ELSE 0 END) as last_pnl,
        SUM(CASE WHEN ma.ciclo = ANY(v_ciclos_sel) THEN ma.dias ELSE 0 END) as last_dias,
        SUM(CASE WHEN va.ciclo = ANY(v_ciclos_prev) THEN va.vits_uniq ELSE 0 END) as prev_vits_uniq,
        SUM(CASE WHEN va.ciclo = ANY(v_ciclos_prev) THEN va.vits_total ELSE 0 END) as prev_visitas,
        SUM(CASE WHEN ma.ciclo = ANY(v_ciclos_prev) THEN ma.pnl ELSE 0 END) as prev_pnl,
        SUM(CASE WHEN ma.ciclo = ANY(v_ciclos_prev) THEN ma.dias ELSE 0 END) as prev_dias
    INTO v_kpis_context
    FROM visitas_ag va
    JOIN metas_ag ma ON va.ciclo = ma.ciclo AND va.cod_setor = ma.cod_setor;

    -- 5. Metricas Brasil - mesma janela selecionada, para a media de comparacao
    -- continuar coerente com o KPI do contexto.
    WITH visitas_br AS (
        SELECT ciclo, cod_setor, COUNT(DISTINCT crmuf) as vits_uniq, COUNT(*) as vits_total
        FROM public.fato_visitas GROUP BY ciclo, cod_setor
    ),
    metas_br AS (
        SELECT ciclo, cod_setor, SUM(tamanho_painel) as pnl, SUM(COALESCE(dias_trabalhados, 20)) as dias
        FROM public.metas_ciclo
        WHERE considerar = true
        GROUP BY ciclo, cod_setor
    )
    SELECT
        SUM(CASE WHEN va.ciclo = ANY(v_ciclos_sel) THEN va.vits_total ELSE 0 END) as total_visitas,
        SUM(CASE WHEN ma.ciclo = ANY(v_ciclos_sel) THEN ma.pnl ELSE 0 END) as total_painel,
        SUM(CASE WHEN ma.ciclo = ANY(v_ciclos_sel) THEN ma.dias ELSE 0 END) as total_dias
    INTO v_kpis_brasil
    FROM visitas_br va
    JOIN metas_br ma ON va.ciclo = ma.ciclo AND va.cod_setor = ma.cod_setor;

    -- 6. Contatos Unicos e Visitas Totais - direto em fato_visitas. Garante
    -- que visitas em setores sem meta tambem contem (mesma logica usada para
    -- contatos), evitando contatos > visitas.
    SELECT COUNT(DISTINCT crmuf), COUNT(*)
    INTO v_contatos_unicos, v_visitas_totais
    FROM public.fato_visitas
    WHERE cod_setor = ANY(v_context_setores)
      AND ciclo = ANY(v_ciclos_sel);

    SELECT COUNT(DISTINCT crmuf), COUNT(*)
    INTO v_contatos_unicos_prev, v_visitas_totais_prev
    FROM public.fato_visitas
    WHERE cod_setor = ANY(v_context_setores)
      AND ciclo = ANY(v_ciclos_prev);

    v_cob_last := CASE WHEN v_kpis_context.last_pnl > 0 THEN (v_kpis_context.last_visitas::numeric / v_kpis_context.last_pnl) * 100 ELSE 0 END;
    v_cob_prev := CASE WHEN v_kpis_context.prev_pnl > 0 THEN (v_kpis_context.prev_visitas::numeric / v_kpis_context.prev_pnl) * 100 ELSE 0 END;

    v_mdv_last := CASE WHEN v_kpis_context.last_dias > 0 THEN (v_kpis_context.last_visitas::numeric / v_kpis_context.last_dias) ELSE 0 END;
    v_mdv_prev := CASE WHEN v_kpis_context.prev_dias > 0 THEN (v_kpis_context.prev_visitas::numeric / v_kpis_context.prev_dias) ELSE 0 END;

    RETURN jsonb_build_object(
        'cobertura', v_cob_last,
        'brasil_cobertura', CASE WHEN v_kpis_brasil.total_painel > 0 THEN (v_kpis_brasil.total_visitas::numeric / v_kpis_brasil.total_painel) * 100 ELSE 0 END,
        'trend_cobertura', v_cob_last - v_cob_prev,
        'mdv', v_mdv_last,
        'brasil_mdv', CASE WHEN v_kpis_brasil.total_dias > 0 THEN (v_kpis_brasil.total_visitas::numeric / v_kpis_brasil.total_dias) ELSE 0 END,
        'trend_mdv', v_mdv_last - v_mdv_prev,
        'visitas_totais', v_visitas_totais,
        'trend_visitas', COALESCE(v_visitas_totais, 0) - COALESCE(v_visitas_totais_prev, 0),
        'contatos_unicos', v_contatos_unicos,
        'trend_contatos', COALESCE(v_contatos_unicos, 0) - COALESCE(v_contatos_unicos_prev, 0),
        'last_ciclo', v_last_ciclo,
        'prev_ciclo', v_prev_ciclo,
        'selected_ciclos', v_ciclos_sel
    );
END;
$function$;
