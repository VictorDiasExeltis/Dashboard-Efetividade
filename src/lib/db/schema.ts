import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  varchar,
  date,
  uuid,
  primaryKey,
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

// Carga diária por setor — valores cumulativos "até o momento" no ciclo.
// HISTÓRICO: um snapshot por setor por dia (PK composta cod_setor + data).
// Cada carga diária empilha um novo snapshot carimbado com a data do upload;
// recarregar o mesmo dia corrige aquele dia (upsert na PK). A tela de Análise
// Diária lê o snapshot mais recente de cada setor dentro do ciclo atual.
export const fato_diario = pgTable('fato_diario', {
  cod_setor:          integer('cod_setor').notNull(),    // FK → dim_hierarquia.cod_setor
  data:               date('data').notNull(),            // dia do snapshot (carimbado na carga)
  ciclo:              varchar('ciclo'),                  // ciclo derivado do calendário na carga
  dias_trabalhados:   numeric('dias_trabalhados').notNull().default('0'),  // aceita frações (ex.: 8.25)
  dias_abonados:      numeric('dias_abonados').notNull().default('0'),     // aceita frações
  visitas_realizadas: integer('visitas_realizadas').notNull().default(0),
  painel:             integer('painel'),                                   // médicos no painel do rep (~170-200+)
}, (t) => [
  primaryKey({ columns: [t.cod_setor, t.data] }),
]);

// Log de cargas — histórico de toda carga feita pela Central de Cargas:
// quem carregou, quando, qual tabela, quantas linhas e sucesso/erro.
export const log_cargas = pgTable('log_cargas', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tabela_destino:     varchar('tabela_destino').notNull(),
  usuario_email:      varchar('usuario_email'),
  arquivo_nome:       varchar('arquivo_nome'),
  linhas_processadas: integer('linhas_processadas').notNull().default(0),
  linhas_afetadas:    integer('linhas_afetadas').notNull().default(0),
  status:             varchar('status').notNull(),   // 'sucesso' | 'erro'
  mensagem:           text('mensagem'),
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
