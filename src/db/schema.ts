import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const estruturaVendas = pgTable('estrutura_vendas', {
  id: serial('id').primaryKey(),
  distrito: varchar('distrito', { length: 255 }).notNull(),
  setor: varchar('setor', { length: 255 }).notNull(),
  representanteId: varchar('representante_id', { length: 255 }).notNull(),
  nomeRepresentante: varchar('nome_representante', { length: 255 }).notNull(),
});

export const medicos = pgTable('medicos', {
  id: serial('id').primaryKey(),
  crm: varchar('crm', { length: 20 }).notNull(),
  uf: varchar('uf', { length: 2 }).notNull(),
  nome: varchar('nome', { length: 255 }).notNull(),
  classificacao: varchar('classificacao', { length: 50 }).notNull(), // VIP, A, B, C
  segmentacaoFoco: varchar('segmentacao_foco', { length: 50 }).notNull(), // PROTEGER, CONQUISTAR, MANTER
  setorId: integer('setor_id').references(() => estruturaVendas.id),
  especialidade: varchar('especialidade', { length: 255 }),
});

export const visitas = pgTable('visitas', {
  id: serial('id').primaryKey(),
  medicoId: integer('medico_id').references(() => medicos.id).notNull(),
  representanteId: varchar('representante_id', { length: 255 }).notNull(),
  dataVisita: timestamp('data_visita').notNull(),
  ciclo: varchar('ciclo', { length: 50 }).notNull(),
  amostrasEntregues: integer('amostras_entregues').default(0),
  observacoes: varchar('observacoes', { length: 1000 }),
});
