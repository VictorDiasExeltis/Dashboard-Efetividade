-- Views que separam "ciclo fechado" de "ciclo aberto/parcial".
-- Aplicar via Supabase SQL editor ou psql contra o banco de produção.
--
-- Regra de negócio:
--   - fato_visitas é carregada semanalmente com o ciclo EM ANDAMENTO (parcial).
--   - A tela "Análise de Ciclo" lê fato_visitas cru (mostra o ciclo aberto).
--   - As telas "Cobertura e MDV" e "Insights" leem fato_visitas_fechado
--     (só ciclos já encerrados). Quando o ciclo fecha, ele passa a aparecer
--     nessas telas automaticamente — sem recarga, só pela virada da data.

-- Ciclo fechado = a última data do ciclo no calendário já passou (America/Sao_Paulo).
-- O pseudo-ciclo anual 202600 (termina 31/12) e o ciclo em andamento ficam de fora.
CREATE OR REPLACE VIEW public.ciclos_fechados AS
SELECT ciclo
FROM public.dim_calendario
GROUP BY ciclo
HAVING MAX(data) < (now() AT TIME ZONE 'America/Sao_Paulo')::date;

-- fato_visitas restrita a ciclos fechados.
CREATE OR REPLACE VIEW public.fato_visitas_fechado AS
SELECT fv.*
FROM public.fato_visitas fv
WHERE fv.ciclo IN (SELECT ciclo FROM public.ciclos_fechados);
