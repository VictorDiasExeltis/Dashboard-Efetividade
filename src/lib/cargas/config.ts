// Configuração da Central de Cargas — compartilhada entre cliente e servidor.
// NÃO importar 'server-only' aqui: o Sidebar e os componentes de upload usam
// estas definições no browser. Nada aqui é segredo (só nomes de coluna e a
// lista de e-mails autorizados, que não é sensível).

// ---------------------------------------------------------------------------
// Controle de acesso — quem pode usar a Central de Cargas (área que grava no
// banco). Para liberar mais alguém, basta adicionar o e-mail abaixo.
// ---------------------------------------------------------------------------
export const EMAILS_AUTORIZADOS_CARGA: string[] = [
  'victor.eugenio@exeltis.com',
];

export function podeCarregar(email?: string | null): boolean {
  if (!email) return false;
  const alvo = email.trim().toLowerCase();
  return EMAILS_AUTORIZADOS_CARGA.some((e) => e.toLowerCase() === alvo);
}

// ---------------------------------------------------------------------------
// Especificação das cargas.
// ---------------------------------------------------------------------------
export type CargaTipo = 'snapshot' | 'sobrescreve' | 'adiciona_ciclo' | 'upsert';
export type ColunaTipo = 'inteiro' | 'decimal' | 'texto';

export interface ColunaSpec {
  campo: string;        // nome canônico (= coluna no banco)
  label: string;        // rótulo amigável
  tipo: ColunaTipo;
  obrigatoria: boolean;
  aliases: string[];    // variações de cabeçalho aceitas no arquivo
  exemplo?: string | number; // valor ilustrativo no modelo p/ download (fallback por tipo)
}

export interface CargaSpec {
  id: string;           // identificador (= nome da tabela alvo)
  tabela: string;
  nome: string;
  descricao: string;
  tipo: CargaTipo;
  grupo: string;        // seção no hub (ex.: 'Diária', 'Ciclo', 'Cadastros')
  implementado: boolean;// false = card só mostra layout ("Em breve"), sem upload
  colunas: ColunaSpec[];
  // Chave única da tabela no banco — usada para avisar sobre linhas repetidas
  // no arquivo, que no upsert fariam a última prevalecer silenciosamente.
  chaveNatural?: string[];
}

export const TIPO_INFO: Record<CargaTipo, { label: string; texto: string }> = {
  snapshot:       { label: 'Snapshot diário',  texto: 'Guarda um snapshot por setor por dia (mantém histórico). Recarregar o mesmo dia corrige aquele dia.' },
  sobrescreve:    { label: 'Sobrescreve',      texto: 'Atualiza/insere uma linha por chave. Não apaga setores ausentes do arquivo.' },
  adiciona_ciclo: { label: 'Adiciona por ciclo', texto: 'Acrescenta as linhas do ciclo informado (bloqueia ciclo já carregado).' },
  upsert:         { label: 'Atualiza (upsert)',  texto: 'Cria novos registros e atualiza os existentes pela chave.' },
};

// --- Grupo "Ciclo": cargas que acrescentam as linhas de um ciclo novo --------

export const CARGA_METAS_CICLO: CargaSpec = {
  id: 'metas_ciclo',
  tabela: 'metas_ciclo',
  nome: 'Desempenho',
  descricao: 'Metas por setor de um ciclo (86 linhas). Faz o ciclo aparecer no filtro do dashboard. Bloqueia ciclo já carregado.',
  tipo: 'adiciona_ciclo',
  grupo: 'Ciclo',
  implementado: false,
  colunas: [
    { campo: 'cod_setor',        label: 'Código do Setor', tipo: 'inteiro', obrigatoria: true,  aliases: ['cod_setor', 'setor', 'codigo'] },
    { campo: 'ciclo',            label: 'Ciclo',           tipo: 'texto',   obrigatoria: true,  aliases: ['ciclo'] },
    { campo: 'dias_trabalhados', label: 'Dias Trabalhados',tipo: 'decimal', obrigatoria: true,  aliases: ['dias_trabalhados', 'dias_trab', 'dt'] },
    { campo: 'tamanho_painel',   label: 'Tamanho do Painel',tipo: 'inteiro', obrigatoria: true, aliases: ['tamanho_painel', 'painel', 'medicos'] },
    { campo: 'considerar',       label: 'Considerar',      tipo: 'texto',   obrigatoria: true, aliases: ['considerar', 'ativo'] },
  ],
  chaveNatural: ['cod_setor', 'ciclo'],
};

export const CARGA_FATO_VISITAS: CargaSpec = {
  id: 'fato_visitas',
  tabela: 'fato_visitas',
  nome: 'Visitação',
  descricao: 'Registros de visita de um ciclo (~10–12 mil linhas). Base de cobertura, MDV e amostras. Carregada em lotes.',
  tipo: 'adiciona_ciclo',
  grupo: 'Ciclo',
  implementado: false,
  colunas: [
    { campo: 'id_visita',   label: 'ID da Visita',   tipo: 'texto',   obrigatoria: true, aliases: ['id_visita', 'id', 'visita_id'] },
    { campo: 'crmuf',       label: 'CRM/UF',         tipo: 'texto',   obrigatoria: true, aliases: ['crmuf', 'crm_uf', 'crm'] },
    { campo: 'cod_setor',   label: 'Código do Setor',tipo: 'inteiro', obrigatoria: true, aliases: ['cod_setor', 'setor'] },
    { campo: 'ciclo',       label: 'Ciclo',          tipo: 'texto',   obrigatoria: true, aliases: ['ciclo'] },
    { campo: 'data_visita', label: 'Data da Visita', tipo: 'texto',   obrigatoria: true, aliases: ['data_visita', 'data', 'dt_visita'] },
  ],
  chaveNatural: ['id_visita'],
};

export const CARGA_FATO_AMOSTRAS: CargaSpec = {
  id: 'fato_amostras',
  tabela: 'fato_amostras',
  nome: 'Amostras',
  descricao: 'Amostras entregues por visita (vincula à visita e ao produto). Base da tela de Entrega de Amostras.',
  tipo: 'adiciona_ciclo',
  grupo: 'Ciclo',
  implementado: false,
  colunas: [
    { campo: 'id_visita',  label: 'ID da Visita', tipo: 'texto',   obrigatoria: true, aliases: ['id_visita', 'visita_id', 'id'] },
    { campo: 'id_produto', label: 'ID do Produto',tipo: 'inteiro', obrigatoria: true, aliases: ['id_produto', 'produto', 'cod_produto'] },
    { campo: 'quantidade', label: 'Quantidade',   tipo: 'inteiro', obrigatoria: true, aliases: ['quantidade', 'qtd', 'qtde'] },
  ],
  chaveNatural: ['id_visita', 'id_produto'],
};

// --- Grupo "Cadastros": dimensões (upsert pela chave) ------------------------

export const CARGA_DIM_MEDICOS: CargaSpec = {
  id: 'dim_medicos',
  tabela: 'dim_medicos',
  nome: 'Painel',
  descricao: 'Cadastro de médicos. Atualiza existentes e cria novos pela chave CRM/UF.',
  tipo: 'upsert',
  grupo: 'Cadastros',
  implementado: false,
  colunas: [
    { campo: 'crmuf',         label: 'CRM/UF',        tipo: 'texto',   obrigatoria: true,  aliases: ['crmuf', 'crm_uf', 'crm'] },
    { campo: 'nome_medico',   label: 'Nome',          tipo: 'texto',   obrigatoria: true, aliases: ['nome_medico', 'nome', 'medico'] },
    { campo: 'classificacao', label: 'Classificação', tipo: 'texto',   obrigatoria: true, aliases: ['classificacao', 'classe'] },
    { campo: 'cod_setor',     label: 'Código do Setor',tipo: 'inteiro',obrigatoria: true, aliases: ['cod_setor', 'setor'] },
    { campo: 'status',        label: 'Ativo',         tipo: 'texto',   obrigatoria: true, aliases: ['status', 'ativo'] },
    { campo: 'score',         label: 'Score',         tipo: 'decimal', obrigatoria: true, aliases: ['score'] },
    { campo: 'especialidade', label: 'Especialidade', tipo: 'texto',   obrigatoria: true, aliases: ['especialidade'] },
    { campo: 'potencial',     label: 'Potencial',     tipo: 'inteiro', obrigatoria: true, aliases: ['potencial'] },
  ],
  chaveNatural: ['crmuf'],
};

export const CARGA_DIM_HIERARQUIA: CargaSpec = {
  id: 'dim_hierarquia',
  tabela: 'dim_hierarquia',
  nome: 'Estrutura',
  descricao: 'Estrutura de setor, representante e distrito. Atualiza/insere pela chave do setor.',
  tipo: 'upsert',
  grupo: 'Cadastros',
  implementado: false,
  colunas: [
    { campo: 'cod_setor',     label: 'Código do Setor', tipo: 'inteiro', obrigatoria: true,  aliases: ['cod_setor', 'setor'] },
    { campo: 'nome_setor',    label: 'Nome do Setor',   tipo: 'texto',   obrigatoria: true, aliases: ['nome_setor'] },
    { campo: 'nome_rep',      label: 'Representante',   tipo: 'texto',   obrigatoria: true, aliases: ['nome_rep', 'rep', 'representante'] },
    { campo: 'cod_distrito',  label: 'Código Distrito', tipo: 'inteiro', obrigatoria: true, aliases: ['cod_distrito', 'distrito_cod'] },
    { campo: 'nome_distrito', label: 'Nome Distrito',   tipo: 'texto',   obrigatoria: true, aliases: ['nome_distrito', 'distrito'] },
    { campo: 'nome_gd',       label: 'Gerente Distrital',tipo: 'texto',  obrigatoria: true, aliases: ['nome_gd', 'gd', 'gerente'] },
  ],
  chaveNatural: ['cod_setor'],
};

export const CARGA_DIM_PRODUTOS: CargaSpec = {
  id: 'dim_produtos',
  tabela: 'dim_produtos',
  nome: 'Produtos',
  descricao: 'Cadastro de produtos e suas marcas. Atualiza/insere pela chave do produto.',
  tipo: 'upsert',
  grupo: 'Cadastros',
  implementado: false,
  colunas: [
    { campo: 'id_produto',   label: 'ID do Produto', tipo: 'inteiro', obrigatoria: true,  aliases: ['id_produto', 'produto_id', 'cod_produto'] },
    { campo: 'nome_produto', label: 'Nome',          tipo: 'texto',   obrigatoria: true, aliases: ['nome_produto', 'produto', 'nome'] },
    { campo: 'id_marca',     label: 'ID da Marca',   tipo: 'inteiro', obrigatoria: true, aliases: ['id_marca', 'marca', 'cod_marca'] },
  ],
  chaveNatural: ['id_produto'],
};

export const CARGA_FATO_SEGMENTACAO: CargaSpec = {
  id: 'fato_segmentacao',
  tabela: 'fato_segmentacao',
  nome: 'Segmentação',
  descricao: 'Segmentação dos médicos por marca (CONQUISTAR, PROTEGER, etc.). Substitui a base inteira.',
  tipo: 'sobrescreve',
  grupo: 'Cadastros',
  implementado: false,
  colunas: [
    { campo: 'crmuf',       label: 'CRM/UF',       tipo: 'texto',   obrigatoria: true, aliases: ['crmuf', 'crm_uf', 'crm'] },
    { campo: 'id_marca',    label: 'ID da Marca',  tipo: 'inteiro', obrigatoria: true, aliases: ['id_marca', 'marca'] },
    { campo: 'segmentacao', label: 'Segmentação',  tipo: 'texto',   obrigatoria: true, aliases: ['segmentacao', 'segmento'] },
  ],
  chaveNatural: ['crmuf', 'id_marca'],
};

// Cargas disponíveis no hub. Nenhuma gravando ainda (implementado:false) até a
// Fase 2/3 religar os commits — os cards mostram só o layout.
export const CARGAS: CargaSpec[] = [
  CARGA_METAS_CICLO,
  CARGA_FATO_VISITAS,
  CARGA_FATO_AMOSTRAS,
  CARGA_DIM_MEDICOS,
  CARGA_DIM_HIERARQUIA,
  CARGA_DIM_PRODUTOS,
  CARGA_FATO_SEGMENTACAO,
];

// Ordem das seções no hub.
export const GRUPOS_ORDEM = ['Ciclo', 'Cadastros'];

export function getCarga(id: string): CargaSpec | undefined {
  return CARGAS.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Parsing/validação — roda no cliente (prévia) e a base é revalidada no servidor.
// ---------------------------------------------------------------------------
// Um valor já convertido para o tipo declarado na coluna. Texto continua texto:
// a versão anterior forçava tudo para número, e por isso NENHUMA carga passava —
// `crmuf` ("SC0033895"), `segmentacao` ("CONQUISTAR") e até `considerar`
// ("TRUE") viravam NaN e a linha inteira era recusada.
export type ValorCanonico = string | number | null;
export type LinhaCanonica = Record<string, ValorCanonico>;

export interface ParseResult {
  ok: boolean;                 // true = sem erros e há linhas válidas
  rows: LinhaCanonica[];       // linhas já no formato canônico (campo → valor)
  erros: string[];
  avisos: string[];
  colunasEncontradas: string[];
}

// Normaliza um cabeçalho: minúsculo, sem acento, espaços/underscores colapsados.
export function normalizeHeader(h: string): string {
  return String(h)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '_');
}

// Converte texto/numero para number. Aceita "8,25" (vírgula decimal) e
// "1.234" (separador de milhar). Retorna NaN se inválido, null se vazio.
function coerceNum(v: unknown, tipo: ColunaTipo): number | null {
  if (v === '' || v == null) return null;
  if (typeof v === 'number') return tipo === 'inteiro' ? Math.round(v) : v;
  let s = String(v).trim();
  if (s === '') return null;
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.'); // vírgula decimal
  else s = s.replace(/,/g, '');                                      // vírgula = milhar
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return tipo === 'inteiro' ? Math.round(n) : n;
}

// Converte respeitando o tipo declarado. Só `inteiro` e `decimal` viram número;
// `texto` é preservado como veio, apenas com as pontas aparadas.
//
// Retorna NaN só para número inválido — é o sinal que o chamador usa para
// marcar erro na linha. Texto nunca produz NaN.
function coerceValor(v: unknown, tipo: ColunaTipo): ValorCanonico {
  if (tipo === 'texto') {
    if (v == null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  }
  return coerceNum(v, tipo);
}

export function parseLinhas(raw: Record<string, unknown>[], spec: CargaSpec): ParseResult {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (!raw.length) {
    return { ok: false, rows: [], erros: ['Arquivo vazio ou sem linhas de dados.'], avisos: [], colunasEncontradas: [] };
  }

  const headerKeys = Object.keys(raw[0]);
  const normMap = new Map<string, string>(); // cabeçalho normalizado → original
  headerKeys.forEach((k) => normMap.set(normalizeHeader(k), k));

  // Mapeia cada campo esperado para a coluna real do arquivo.
  const colMap: Record<string, string | null> = {};
  for (const col of spec.colunas) {
    let found: string | null = null;
    for (const alias of [col.campo, ...col.aliases]) {
      const key = normMap.get(normalizeHeader(alias));
      if (key) { found = key; break; }
    }
    colMap[col.campo] = found;
    if (!found && col.obrigatoria) {
      erros.push(`Coluna obrigatória não encontrada: "${col.label}". Cabeçalhos aceitos: ${[col.campo, ...col.aliases].slice(0, 4).join(', ')}.`);
    }
  }

  const temColunaSetor = spec.colunas.some((c) => c.campo === 'cod_setor');

  const rows: LinhaCanonica[] = [];
  let linhasComErro = 0;

  raw.forEach((r, i) => {
    const obj: LinhaCanonica = {};
    let rowErro = false;
    for (const col of spec.colunas) {
      const key = colMap[col.campo];
      if (!key) { obj[col.campo] = null; continue; }
      const val = coerceValor(r[key], col.tipo);
      if (typeof val === 'number' && Number.isNaN(val)) {
        rowErro = true;
        if (erros.length < 10) erros.push(`Linha ${i + 2}: valor inválido em "${col.label}" → "${String(r[key])}".`);
        obj[col.campo] = null;
      } else {
        obj[col.campo] = val;
      }
    }
    // Todas as colunas são obrigatórias: nenhuma pode ficar vazia na linha.
    for (const col of spec.colunas) {
      if (col.obrigatoria && obj[col.campo] == null) {
        rowErro = true;
        if (erros.length < 10) erros.push(`Linha ${i + 2}: "${col.label}" vazio (obrigatório).`);
      }
    }
    // Só vale para cargas que têm setor. Antes rodava sempre e não fazia
    // sentido em fato_segmentacao ou dim_produtos, que nem têm a coluna.
    if (temColunaSetor && obj.cod_setor != null && !(Number(obj.cod_setor) > 0)) {
      rowErro = true;
      if (erros.length < 10) erros.push(`Linha ${i + 2}: código de setor inválido.`);
    }
    if (rowErro) linhasComErro++;
    else rows.push(obj);
  });

  // Duplicidade pela chave natural da carga (a mesma do banco). Antes olhava
  // sempre `cod_setor`, o que dava aviso errado onde a chave é outra: em
  // fato_segmentacao é (crmuf, id_marca), em dim_medicos é só (crmuf).
  if (spec.chaveNatural?.length) {
    const vistos = new Set<string>();
    let dups = 0;
    for (const row of rows) {
      const k = spec.chaveNatural.map((c) => String(row[c] ?? '')).join('|');
      if (vistos.has(k)) dups++;
      else vistos.add(k);
    }
    if (dups > 0) {
      const rotulo = spec.chaveNatural
        .map((c) => spec.colunas.find((x) => x.campo === c)?.label ?? c)
        .join(' + ');
      avisos.push(`${dups} linha(s) repetem a chave ${rotulo} — a última de cada prevalece.`);
    }
  }
  if (linhasComErro > 0) avisos.push(`${linhasComErro} linha(s) ignorada(s) por erro de valor.`);

  return { ok: erros.length === 0 && rows.length > 0, rows, erros, avisos, colunasEncontradas: headerKeys };
}
