CREATE OR REPLACE FUNCTION public.get_cobertura_dinamica(p_estrutura text, p_distrito_filtro text)
 RETURNS TABLE(ciclo character varying, label character varying, total_visitas bigint, total_painel bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_estrutura = 'Brasil' THEN
        -- Visão Brasil (Geral consolidado de todos os distritos)
        RETURN QUERY
        WITH visitas_agrupadas AS (
            SELECT 
                fv.ciclo,
                fv.cod_setor,
                COUNT(*) AS total_visitas
            FROM public.fato_visitas fv
            GROUP BY fv.ciclo, fv.cod_setor
        ),
        metas_agrupadas AS (
            SELECT 
                m.ciclo,
                m.cod_setor,
                SUM(m.tamanho_painel) AS total_painel
            FROM public.metas_ciclo m
            WHERE m.considerar = true
            GROUP BY m.ciclo, m.cod_setor
        )
        SELECT 
            v.ciclo,
            'Brasil'::character varying as label,
            SUM(v.total_visitas)::bigint AS total_visitas,
            SUM(m.total_painel)::bigint AS total_painel
        FROM visitas_agrupadas v
        JOIN metas_agrupadas m ON v.ciclo = m.ciclo AND v.cod_setor = m.cod_setor
        GROUP BY v.ciclo
        ORDER BY v.ciclo;
    ELSIF p_estrutura = 'Setor' AND p_distrito_filtro IS NOT NULL AND p_distrito_filtro <> '' AND p_distrito_filtro <> 'Todos' THEN
        -- Visão por Setor (Sempre filtrado por Distrito)
        RETURN QUERY
        WITH visitas_agrupadas AS (
            SELECT 
                fv.ciclo,
                fv.cod_setor,
                COUNT(*) AS total_visitas
            FROM public.fato_visitas fv
            GROUP BY fv.ciclo, fv.cod_setor
        ),
        metas_agrupadas AS (
            SELECT 
                m.ciclo,
                m.cod_setor,
                SUM(m.tamanho_painel) AS total_painel
            FROM public.metas_ciclo m
            WHERE m.considerar = true
            GROUP BY m.ciclo, m.cod_setor
        )
        SELECT 
            v.ciclo,
            h.nome_setor::character varying as label,
            SUM(v.total_visitas)::bigint AS total_visitas,
            SUM(m.total_painel)::bigint AS total_painel
        FROM visitas_agrupadas v
        JOIN metas_agrupadas m ON v.ciclo = m.ciclo AND v.cod_setor = m.cod_setor
        JOIN public.dim_hierarquia h ON v.cod_setor = h.cod_setor
        WHERE h.nome_distrito = p_distrito_filtro
        GROUP BY v.ciclo, h.nome_setor
        ORDER BY v.ciclo, h.nome_setor;
    ELSE
        -- Visão por Distrito (Agora respeita o filtro de p_distrito_filtro se fornecido)
        RETURN QUERY
        WITH visitas_agrupadas AS (
            SELECT 
                fv.ciclo,
                fv.cod_setor,
                COUNT(*) AS total_visitas
            FROM public.fato_visitas fv
            GROUP BY fv.ciclo, fv.cod_setor
        ),
        metas_agrupadas AS (
            SELECT 
                m.ciclo,
                m.cod_setor,
                SUM(m.tamanho_painel) AS total_painel
            FROM public.metas_ciclo m
            WHERE m.considerar = true
            GROUP BY m.ciclo, m.cod_setor
        )
        SELECT 
            v.ciclo,
            h.nome_distrito::character varying as label,
            SUM(v.total_visitas)::bigint AS total_visitas,
            SUM(m.total_painel)::bigint AS total_painel
        FROM visitas_agrupadas v
        JOIN metas_agrupadas m ON v.ciclo = m.ciclo AND v.cod_setor = m.cod_setor
        JOIN public.dim_hierarquia h ON v.cod_setor = h.cod_setor
        WHERE (p_distrito_filtro IS NULL OR p_distrito_filtro = '' OR p_distrito_filtro = 'Todos' OR h.nome_distrito = p_distrito_filtro)
        GROUP BY v.ciclo, h.nome_distrito
        ORDER BY v.ciclo, h.nome_distrito;
    END IF;
END;
$function$;
