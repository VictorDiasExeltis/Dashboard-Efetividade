-- ─────────────────────────────────────────────────────────────────────────
-- Índices p/ reduzir Disk IO. As RPCs (get_cobertura_dinamica,
-- get_executive_kpis, get_mdv_dinamico) agregam fato_visitas por
-- (ciclo, cod_setor) a cada load — sem índice isso faz seq scan da tabela
-- inteira. Estes índices permitem index-only scan e cortam leitura de disco.
--
-- CONCURRENTLY: não trava a tabela durante a criação (rode fora de transação,
-- ou seja, uma linha por vez no SQL Editor do Supabase).
-- IF NOT EXISTS: idempotente, pode rodar de novo sem erro.
-- ─────────────────────────────────────────────────────────────────────────

-- fato_visitas — maior tabela, mais escaneada
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fato_visitas_setor_ciclo
  ON public.fato_visitas (cod_setor, ciclo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fato_visitas_ciclo
  ON public.fato_visitas (ciclo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fato_visitas_crmuf
  ON public.fato_visitas (crmuf);

-- metas_ciclo — agregada junto com fato_visitas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metas_ciclo_setor_ciclo
  ON public.metas_ciclo (cod_setor, ciclo);

-- fato_segmentacao — join por crmuf na lista de médicos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fato_segmentacao_crmuf
  ON public.fato_segmentacao (crmuf);

-- dim_medicos — filtra por setor/status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dim_medicos_setor
  ON public.dim_medicos (cod_setor);

-- Atualiza estatísticas + marca visibilidade (necessário p/ index-only scan).
-- Rode depois de cada carga diária também.
VACUUM ANALYZE public.fato_visitas;
VACUUM ANALYZE public.metas_ciclo;
VACUUM ANALYZE public.fato_segmentacao;
VACUUM ANALYZE public.dim_medicos;
