-- Historicidade da segmentação (aplicado em 2026-09-24).
--
-- `fato_segmentacao.ciclo_inicio` = primeiro ciclo em que aquele valor vale.
-- Cada carga entra como versão nova, sem apagar a anterior. Versões existentes:
--   202601 -> segmentação de maio/2026   (vale até o ciclo 10)
--   202611 -> segmentação de agosto/2026 (chegou no fim do ciclo 10, e o
--             representante só trabalhou com ela a partir do ciclo 11)
--
-- Motivo: a tabela não tinha dimensão de tempo, então toda carga reescrevia os
-- relatórios de ciclos já fechados. Em 02/09 isso obrigou a reverter a base de
-- agosto para a de maio — com as views abaixo, as duas convivem.

-- Segmentação vigente em cada ciclo. Materializada porque a expansão
-- (versões × ciclos) é fixa entre cargas e as telas filtram por ciclo.
-- Um par sem valor na versão nova mantém o da versão anterior.
DROP MATERIALIZED VIEW IF EXISTS public.fato_segmentacao_ciclo;
CREATE MATERIALIZED VIEW public.fato_segmentacao_ciclo AS
SELECT DISTINCT ON (c.ciclo, s.crmuf, s.id_marca)
       c.ciclo, s.crmuf, s.id_marca, s.segmentacao
FROM (SELECT DISTINCT ciclo FROM public.dim_calendario WHERE ciclo <> '202600') c
JOIN public.fato_segmentacao s ON s.ciclo_inicio <= c.ciclo
ORDER BY c.ciclo, s.crmuf, s.id_marca, s.ciclo_inicio DESC;

CREATE UNIQUE INDEX idx_seg_ciclo_pk    ON public.fato_segmentacao_ciclo (ciclo, crmuf, id_marca);
CREATE INDEX        idx_seg_ciclo_crmuf ON public.fato_segmentacao_ciclo (crmuf, id_marca);
REVOKE ALL ON public.fato_segmentacao_ciclo FROM anon, authenticated;

-- Versão mais recente, para telas que falam do painel de hoje (Target List).
DROP VIEW IF EXISTS public.fato_segmentacao_atual;
CREATE VIEW public.fato_segmentacao_atual
WITH (security_invoker = true) AS
SELECT DISTINCT ON (crmuf, id_marca) crmuf, id_marca, segmentacao, ciclo_inicio
FROM public.fato_segmentacao
ORDER BY crmuf, id_marca, ciclo_inicio DESC;

-- OBRIGATÓRIO depois de toda carga de segmentação:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.fato_segmentacao_ciclo;
