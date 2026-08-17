// Espelho do schema `public` no Supabase, sincronizado em 2026-08-17 a partir do
// banco real (information_schema + pg_constraint), não das migrations em ./drizzle.
// As migrations estão defasadas: descrevem uma `fato_diario` que não existe mais,
// colunas de endereço que nunca foram aplicadas e nenhuma das FKs abaixo.
// Ao alterar este arquivo, confira o banco antes — ele é a fonte da verdade.

import {
  pgTable,
  text,
  integer,
  smallint,
  serial,
  numeric,
  boolean,
  varchar,
  date,
  uuid,
  timestamp,
  index,
  unique,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Dimensões
// ---------------------------------------------------------------------------

export const dim_calendario = pgTable('dim_calendario', {
  data:  date('data').primaryKey(),
  ciclo: varchar('ciclo').notNull(),
});

export const dim_hierarquia = pgTable('dim_hierarquia', {
  cod_setor:     integer('cod_setor').primaryKey(),
  nome_rep:      varchar('nome_rep', { length: 255 }).notNull(),
  cod_distrito:  integer('cod_distrito'),
  nome_gd:       varchar('nome_gd', { length: 255 }),
  nome_distrito: varchar('nome_distrito', { length: 255 }),
  nome_setor:    varchar('nome_setor', { length: 255 }),
});

export const dim_marcas = pgTable('dim_marcas', {
  id_marca:   serial('id_marca').primaryKey(),
  nome_marca: varchar('nome_marca', { length: 100 }).notNull(),
});

export const dim_produtos = pgTable('dim_produtos', {
  id_produto:   serial('id_produto').primaryKey(),
  nome_produto: varchar('nome_produto', { length: 100 }).notNull(),
  id_marca:     integer('id_marca').references(() => dim_marcas.id_marca),
});

export const dim_medicos = pgTable(
  'dim_medicos',
  {
    crmuf:         varchar('crmuf', { length: 20 }).primaryKey(),
    nome_medico:   varchar('nome_medico', { length: 255 }).notNull(),
    classificacao: varchar('classificacao', { length: 50 }),
    cod_setor:     integer('cod_setor')
      .references(() => dim_hierarquia.cod_setor, { onUpdate: 'cascade' }),
    status:        boolean('status').default(true),
    score:         numeric('score', { precision: 15, scale: 2 }),
    data_inclusao: date('data_inclusao'),
    especialidade: text('especialidade'),
    potencial:     smallint('potencial'),
    cep:           varchar('cep'),
    bairro:        text('bairro'),
    municipio:     varchar('municipio'),
    estado:        varchar('estado', { length: 2 }),
  },
  (t) => [
    index('idx_dim_medicos_setor').on(t.cod_setor),
    check(
      'dim_medicos_potencial_range',
      sql`${t.potencial} IS NULL OR (${t.potencial} >= 0 AND ${t.potencial} <= 5)`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Fatos
// ---------------------------------------------------------------------------

export const fato_visitas = pgTable(
  'fato_visitas',
  {
    id_visita:   text('id_visita').primaryKey(),
    crmuf:       varchar('crmuf', { length: 20 }).references(() => dim_medicos.crmuf),
    cod_setor:   integer('cod_setor')
      .references(() => dim_hierarquia.cod_setor, { onUpdate: 'cascade' }),
    ciclo:       varchar('ciclo', { length: 10 }).notNull(),
    data_visita: date('data_visita'),
  },
  (t) => [
    index('idx_fato_visitas_crmuf').on(t.crmuf),
    index('idx_fato_visitas_ciclo').on(t.ciclo),
    index('idx_fato_visitas_crmuf_ciclo').on(t.crmuf, t.ciclo),
    index('idx_fato_visitas_setor_ciclo').on(t.cod_setor, t.ciclo),
  ],
);

// PK no banco chama-se `amostras_pkey` (nome legado, tabela renomeada depois).
export const fato_amostras = pgTable(
  'fato_amostras',
  {
    id_amostra: uuid('id_amostra').primaryKey().defaultRandom(),
    id_visita:  text('id_visita').notNull()
      .references(() => fato_visitas.id_visita, { onDelete: 'cascade' }),
    id_produto: integer('id_produto').notNull().references(() => dim_produtos.id_produto),
    quantidade: integer('quantidade').default(1),
  },
  // Índice da coluna da FK: sem ele, todo DELETE em fato_visitas varria as ~270k
  // amostras por linha apagada (um DELETE de 4.199 visitas estourou o timeout).
  // Também serve aos JOINs de amostras × visitas da Alocação de Recursos.
  (t) => [index('idx_fato_amostras_id_visita').on(t.id_visita)],
);

export const fato_abonos = pgTable('fato_abonos', {
  id_abono:       uuid('id_abono').primaryKey().defaultRandom(),
  cod_setor:      integer('cod_setor').notNull()
    .references(() => dim_hierarquia.cod_setor, { onUpdate: 'cascade', onDelete: 'cascade' }),
  motivo:         text('motivo').notNull(),
  data_abono:     date('data_abono').references(() => dim_calendario.data),
  horas_abonadas: numeric('horas_abonadas'),
});

export const fato_segmentacao = pgTable(
  'fato_segmentacao',
  {
    id_segmentacao: uuid('id_segmentacao').primaryKey().default(sql`uuid_generate_v4()`),
    crmuf:          varchar('crmuf', { length: 20 }).references(() => dim_medicos.crmuf),
    id_marca:       integer('id_marca').references(() => dim_marcas.id_marca),
    segmentacao:    varchar('segmentacao', { length: 50 }),
  },
  (t) => [
    unique('fato_segmentacao_crm_id_marca_key').on(t.crmuf, t.id_marca),
    index('idx_fato_segmentacao_crmuf').on(t.crmuf),
  ],
);

// Metas por ciclo (substitui o antigo `produtividade_ciclo`)
export const metas_ciclo = pgTable(
  'metas_ciclo',
  {
    id_meta:          uuid('id_meta').primaryKey().default(sql`uuid_generate_v4()`),
    cod_setor:        integer('cod_setor')
      .references(() => dim_hierarquia.cod_setor, { onUpdate: 'cascade' }),
    ciclo:            varchar('ciclo', { length: 10 }).notNull(),
    dias_trabalhados: numeric('dias_trabalhados', { precision: 5, scale: 2 }).default('20'),
    tamanho_painel:   integer('tamanho_painel'),
    considerar:       boolean('considerar').default(true),
  },
  (t) => [
    unique('metas_ciclo_cod_setor_ciclo_key').on(t.cod_setor, t.ciclo),
    index('idx_metas_ciclo_setor_ciclo').on(t.cod_setor, t.ciclo),
  ],
);

// ---------------------------------------------------------------------------
// Operacional
// ---------------------------------------------------------------------------

// Log de cargas — histórico de toda carga feita pela Central de Cargas:
// quem carregou, quando, qual tabela, quantas linhas e sucesso/erro.
export const log_cargas = pgTable(
  'log_cargas',
  {
    id:                 uuid('id').primaryKey().defaultRandom(),
    tabela_destino:     varchar('tabela_destino').notNull(),
    usuario_email:      varchar('usuario_email'),
    arquivo_nome:       varchar('arquivo_nome'),
    linhas_processadas: integer('linhas_processadas').notNull().default(0),
    linhas_afetadas:    integer('linhas_afetadas').notNull().default(0),
    status:             varchar('status').notNull(),   // 'sucesso' | 'erro'
    mensagem:           text('mensagem'),
    criado_em:          timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_log_cargas_criado_em').on(t.criado_em.desc())],
);

// ---------------------------------------------------------------------------
// Resumo do ciclo em andamento
// ---------------------------------------------------------------------------

// Alimenta EXCLUSIVAMENTE a Análise de Ciclo, a partir do relatório
// simplificado por setor. A tela mostra sempre o ciclo aberto; quando ele fecha,
// ela vira para o próximo e o encerrado passa a viver nas telas consolidadas,
// com as bases oficiais (fato_visitas / metas_ciclo / fato_abonos).
//
// Existe porque carregar as 3 bases detalhadas todo dia é inviável: dependem de
// dim_medicos estar em dia (uma carga travou por 3 CRMs ausentes). Este resumo é
// por setor, sem FK para médico.
//
// `dias_abonados` diverge de fato_abonos de propósito — alguns motivos são
// removidos manualmente do relatório oficial, e é regra de negócio.
// A coluna `mdv` do arquivo não é importada: é calculada e vem com #DIV/0!.
export const fato_ciclo_resumo = pgTable(
  'fato_ciclo_resumo',
  {
    cod_setor:        integer('cod_setor').notNull()
      .references(() => dim_hierarquia.cod_setor, { onUpdate: 'cascade' }),
    ciclo:            varchar('ciclo', { length: 10 }).notNull(),
    // fracionários: o relatório traz 14,5 / 14,25 quando o abono é de meio período
    dias_trabalhados: numeric('dias_trabalhados', { precision: 6, scale: 2 }),
    dias_abonados:    numeric('dias_abonados', { precision: 6, scale: 2 }),
    tamanho_painel:   integer('tamanho_painel'),
    visitas:          integer('visitas'),
    considerar:       boolean('considerar').notNull().default(true),
    atualizado_em:    timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  // Chave natural: um registro por setor por ciclo. A carga substitui o ciclo.
  (t) => [primaryKey({ columns: [t.cod_setor, t.ciclo] })],
);
