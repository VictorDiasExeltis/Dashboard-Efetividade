import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  varchar,
  date,
  uuid,
} from 'drizzle-orm/pg-core';

// Dimensões
export const dim_medicos = pgTable('dim_medicos', {
  crmuf:         varchar('crmuf').primaryKey(),
  nome_medico:   varchar('nome_medico'),
  classificacao: varchar('classificacao'),
  cod_setor:     integer('cod_setor'),
  status:        boolean('status'),
  score:         numeric('score'),
  data_inclusao: date('data_inclusao'),
  especialidade: text('especialidade'),
});

export const dim_hierarquia = pgTable('dim_hierarquia', {
  cod_setor:     integer('cod_setor').primaryKey(),
  nome_rep:      varchar('nome_rep'),
  cod_distrito:  integer('cod_distrito'),
  nome_gd:       varchar('nome_gd'),
  nome_distrito: varchar('nome_distrito'),
  nome_setor:    varchar('nome_setor'),
});

// Fatos
export const fato_visitas = pgTable('fato_visitas', {
  crmuf:       varchar('crmuf'),
  cod_setor:   integer('cod_setor'),
  ciclo:       varchar('ciclo'),
  data_visita: date('data_visita'),
  id_visita:   text('id_visita').primaryKey(),
});

export const fato_segmentacao = pgTable('fato_segmentacao', {
  crmuf:       varchar('crmuf'),
  id_marca:    integer('id_marca'),
  segmentacao: varchar('segmentacao'),
});

// Metas por ciclo (substitui o antigo `produtividade_ciclo`)
export const metas_ciclo = pgTable('metas_ciclo', {
  id_meta:          uuid('id_meta').primaryKey(),
  cod_setor:        integer('cod_setor'),
  ciclo:            varchar('ciclo'),
  dias_trabalhados: numeric('dias_trabalhados'),
  tamanho_painel:   integer('tamanho_painel'),
  considerar:       boolean('considerar'),
});
