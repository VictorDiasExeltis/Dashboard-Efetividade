import { pgTable, text, integer, numeric, bigserial } from 'drizzle-orm/pg-core';

export const produtividade_ciclo = pgTable('produtividade_ciclo', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ciclo: text('ciclo').notNull(),
  estrutura: text('estrutura'),
  distrito: text('distrito').notNull(),
  considerar: text('considerar'),
  setor_cliente: text('setor_cliente'),
  setor: integer('setor').notNull(),
  nome: text('nome').notNull(),
  dias_trab: numeric('dias_trab').notNull(),
  cad_final_ciclo: integer('cad_final_ciclo').notNull(),
  vis_total: integer('vis_total').notNull(),
});
