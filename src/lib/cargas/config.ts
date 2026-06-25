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
}

export const TIPO_INFO: Record<CargaTipo, { label: string; texto: string }> = {
  snapshot:       { label: 'Snapshot diário',  texto: 'Guarda um snapshot por setor por dia (mantém histórico). Recarregar o mesmo dia corrige aquele dia.' },
  sobrescreve:    { label: 'Sobrescreve',      texto: 'Atualiza/insere uma linha por chave. Não apaga setores ausentes do arquivo.' },
  adiciona_ciclo: { label: 'Adiciona por ciclo', texto: 'Acrescenta as linhas do ciclo informado (bloqueia ciclo já carregado).' },
  upsert:         { label: 'Atualiza (upsert)',  texto: 'Cria novos registros e atualiza os existentes pela chave.' },
};

export const CARGA_FATO_DIARIO: CargaSpec = {
  id: 'fato_diario',
  tabela: 'fato_diario',
  nome: 'Visita Diária',
  descricao:
    'Alimenta a tela de Análise Diária. Cada carga guarda um snapshot por setor carimbado com a data de hoje (mantém o histórico do ciclo). A tela mostra o snapshot mais recente; recarregar o mesmo dia corrige aquele dia.',
  tipo: 'snapshot',
  grupo: 'Diária',
  implementado: true,
  colunas: [
    { campo: 'cod_setor',          label: 'Código do Setor',   tipo: 'inteiro', obrigatoria: true,  aliases: ['cod_setor', 'codigo_setor', 'codigo_do_setor', 'setor', 'codigo', 'cod'] },
    { campo: 'dias_trabalhados',   label: 'Dias Trabalhados',  tipo: 'decimal', obrigatoria: true,  aliases: ['dias_trabalhados', 'dias_trab', 'dias_uteis_trabalhados', 'dt'] },
    { campo: 'dias_abonados',      label: 'Dias Abonados',     tipo: 'decimal', obrigatoria: true,  aliases: ['dias_abonados', 'dias_abono', 'dias_abon', 'abonos', 'da'] },
    { campo: 'visitas_realizadas', label: 'Visitas Realizadas',tipo: 'inteiro', obrigatoria: true,  aliases: ['visitas_realizadas', 'visitas', 'visitas_real', 'vr'] },
    { campo: 'painel',             label: 'Painel',            tipo: 'inteiro', obrigatoria: false, aliases: ['painel', 'tamanho_painel', 'medicos_painel', 'medicos'] },
  ],
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
    { campo: 'considerar',       label: 'Considerar',      tipo: 'texto',   obrigatoria: false, aliases: ['considerar', 'ativo'] },
  ],
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
    { campo: 'nome_medico',   label: 'Nome',          tipo: 'texto',   obrigatoria: false, aliases: ['nome_medico', 'nome', 'medico'] },
    { campo: 'classificacao', label: 'Classificação', tipo: 'texto',   obrigatoria: false, aliases: ['classificacao', 'classe'] },
    { campo: 'cod_setor',     label: 'Código do Setor',tipo: 'inteiro',obrigatoria: false, aliases: ['cod_setor', 'setor'] },
    { campo: 'status',        label: 'Ativo',         tipo: 'texto',   obrigatoria: false, aliases: ['status', 'ativo'] },
    { campo: 'score',         label: 'Score',         tipo: 'decimal', obrigatoria: false, aliases: ['score'] },
    { campo: 'especialidade', label: 'Especialidade', tipo: 'texto',   obrigatoria: false, aliases: ['especialidade'] },
    { campo: 'potencial',     label: 'Potencial',     tipo: 'inteiro', obrigatoria: false, aliases: ['potencial'] },
  ],
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
    { campo: 'nome_setor',    label: 'Nome do Setor',   tipo: 'texto',   obrigatoria: false, aliases: ['nome_setor'] },
    { campo: 'nome_rep',      label: 'Representante',   tipo: 'texto',   obrigatoria: false, aliases: ['nome_rep', 'rep', 'representante'] },
    { campo: 'cod_distrito',  label: 'Código Distrito', tipo: 'inteiro', obrigatoria: false, aliases: ['cod_distrito', 'distrito_cod'] },
    { campo: 'nome_distrito', label: 'Nome Distrito',   tipo: 'texto',   obrigatoria: false, aliases: ['nome_distrito', 'distrito'] },
    { campo: 'nome_gd',       label: 'Gerente Distrital',tipo: 'texto',  obrigatoria: false, aliases: ['nome_gd', 'gd', 'gerente'] },
  ],
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
    { campo: 'nome_produto', label: 'Nome',          tipo: 'texto',   obrigatoria: false, aliases: ['nome_produto', 'produto', 'nome'] },
    { campo: 'id_marca',     label: 'ID da Marca',   tipo: 'inteiro', obrigatoria: false, aliases: ['id_marca', 'marca', 'cod_marca'] },
  ],
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
};

// Cargas disponíveis no hub. Só a Diária está ligada (implementado:true);
// as demais mostram só o layout até a Fase 2/3.
export const CARGAS: CargaSpec[] = [
  CARGA_FATO_DIARIO,
  CARGA_METAS_CICLO,
  CARGA_FATO_VISITAS,
  CARGA_FATO_AMOSTRAS,
  CARGA_DIM_MEDICOS,
  CARGA_DIM_HIERARQUIA,
  CARGA_DIM_PRODUTOS,
  CARGA_FATO_SEGMENTACAO,
];

// Ordem das seções no hub.
export const GRUPOS_ORDEM = ['Diária', 'Ciclo', 'Cadastros'];

export function getCarga(id: string): CargaSpec | undefined {
  return CARGAS.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Parsing/validação — roda no cliente (prévia) e a base é revalidada no servidor.
// ---------------------------------------------------------------------------
export type LinhaCanonica = Record<string, number | null>;

export interface ParseResult {
  ok: boolean;                 // true = sem erros e há linhas válidas
  rows: LinhaCanonica[];       // linhas já no formato canônico (campo → número)
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

  const rows: LinhaCanonica[] = [];
  let linhasComErro = 0;

  raw.forEach((r, i) => {
    const obj: LinhaCanonica = {};
    let rowErro = false;
    for (const col of spec.colunas) {
      const key = colMap[col.campo];
      if (!key) { obj[col.campo] = null; continue; }
      const val = coerceNum(r[key], col.tipo);
      if (Number.isNaN(val)) {
        rowErro = true;
        if (erros.length < 10) erros.push(`Linha ${i + 2}: valor inválido em "${col.label}" → "${String(r[key])}".`);
        obj[col.campo] = null;
      } else {
        obj[col.campo] = val;
      }
    }
    if (obj.cod_setor == null || !(obj.cod_setor > 0)) {
      rowErro = true;
      if (erros.length < 10) erros.push(`Linha ${i + 2}: código de setor ausente ou inválido.`);
    }
    if (rowErro) linhasComErro++;
    else rows.push(obj);
  });

  // Avisa sobre setores duplicados (a última ocorrência prevalece no upsert).
  const seen = new Set<number>();
  let dups = 0;
  for (const row of rows) {
    const k = row.cod_setor as number;
    if (seen.has(k)) dups++;
    else seen.add(k);
  }
  if (dups > 0) avisos.push(`${dups} setor(es) aparecem mais de uma vez — a última linha de cada um prevalece.`);
  if (linhasComErro > 0) avisos.push(`${linhasComErro} linha(s) ignorada(s) por erro de valor.`);

  return { ok: erros.length === 0 && rows.length > 0, rows, erros, avisos, colunasEncontradas: headerKeys };
}
