CREATE TABLE "dim_hierarquia" (
	"cod_setor" integer PRIMARY KEY NOT NULL,
	"nome_rep" varchar,
	"cod_distrito" integer,
	"nome_gd" varchar,
	"nome_distrito" varchar,
	"nome_setor" varchar
);
--> statement-breakpoint
CREATE TABLE "dim_medicos" (
	"crmuf" varchar PRIMARY KEY NOT NULL,
	"nome_medico" varchar,
	"classificacao" varchar,
	"cod_setor" integer,
	"status" boolean,
	"score" numeric,
	"data_inclusao" date,
	"especialidade" text
);
--> statement-breakpoint
CREATE TABLE "fato_diario" (
	"cod_setor" integer PRIMARY KEY NOT NULL,
	"dias_trabalhados" numeric DEFAULT '0' NOT NULL,
	"dias_abonados" numeric DEFAULT '0' NOT NULL,
	"visitas_realizadas" integer DEFAULT 0 NOT NULL,
	"painel" integer
);
--> statement-breakpoint
CREATE TABLE "fato_segmentacao" (
	"crmuf" varchar,
	"id_marca" integer,
	"segmentacao" varchar
);
--> statement-breakpoint
CREATE TABLE "fato_visitas" (
	"crmuf" varchar,
	"cod_setor" integer,
	"ciclo" varchar,
	"data_visita" date,
	"id_visita" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metas_ciclo" (
	"id_meta" uuid PRIMARY KEY NOT NULL,
	"cod_setor" integer,
	"ciclo" varchar,
	"dias_trabalhados" numeric,
	"tamanho_painel" integer,
	"considerar" boolean
);
