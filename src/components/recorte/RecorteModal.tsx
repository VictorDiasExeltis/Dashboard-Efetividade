'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { X, Search, Download, Loader2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { getSupabaseClient } from '@/src/lib/supabase/client';

// Modal de recorte: mostra a lista de registros por trás de uma tabela agregada.
//
// A tela dona passa (a) as colunas, (b) uma função que busca uma página e (c)
// uma que busca tudo para exportar. O modal cuida de busca, paginação, Esc,
// trava de rolagem e geração do xlsx — assim as duas telas que o usam não
// reimplementam nada disso e não divergem com o tempo.
//
// Paginação existe por necessidade, não por estética: sem filtro de território
// o recorte passa de 15 mil médicos, e jogar isso no DOM de uma vez trava o
// navegador. A busca resolve a maioria dos casos sem rolar nada.

export interface ColunaRecorte<T> {
  chave: string;
  label: string;
  // Classe da célula — use para alinhar número à direita, esconder no mobile etc.
  className?: string;
  valor: (linha: T) => string | number;
  // Sai no Excel mas não na tabela da tela. Serve para dados que interessam ao
  // trabalho de campo (endereço, por exemplo) e só atrapalhariam a leitura na
  // tela, onde as colunas já disputam largura.
  somenteExport?: boolean;
}

export interface PaginaRecorte<T> {
  linhas: T[];
  total: number;      // total do recorte já filtrado
  totalGeral: number; // total sem os filtros do modal
}

interface Props<T> {
  aberto: boolean;
  onFechar: () => void;
  // Nome da tela de origem, usado na 1ª linha do arquivo exportado.
  tela?: string;
  titulo: string;
  // Filtros aplicados, por extenso. Vai no cabeçalho e dentro do arquivo
  // exportado — sem isso a planilha chega no e-mail de alguém sem contexto.
  recorte: string;
  colunas: ColunaRecorte<T>[];
  // Controles específicos da tela (selects de segmentação, situação...).
  filtros?: React.ReactNode;
  // Muda quando os filtros do parent mudam, para o modal recarregar.
  versao?: string;
  carregar: (p: { busca: string; limit: number; offset: number }) => Promise<PaginaRecorte<T>>;
  exportar: (p: { busca: string }) => Promise<T[]>;
  nomeArquivo: string;
}

const PAGINA = 100;

export function RecorteModal<T>({
  aberto,
  onFechar,
  tela,
  titulo,
  recorte,
  colunas,
  filtros,
  versao = '',
  carregar,
  exportar,
  nomeArquivo,
}: Props<T>) {
  const [linhas, setLinhas] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalGeral, setTotalGeral] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [busca, setBusca] = useState('');
  const [buscaAtiva, setBuscaAtiva] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Evita que uma resposta lenta de uma busca antiga sobrescreva a atual.
  const requisicao = useRef(0);
  const listaRef = useRef<HTMLDivElement>(null);

  // Digitar não dispara consulta a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  // Trocar de filtro ou de busca volta para a primeira página. Ajustar o estado
  // durante o render (em vez de num efeito) evita o pedido descartado que
  // aconteceria ao buscar a página 4 do recorte novo antes do reset chegar.
  const chave = `${buscaAtiva}|${versao}`;
  const chaveAnterior = useRef(chave);
  if (chaveAnterior.current !== chave) {
    chaveAnterior.current = chave;
    if (pagina !== 0) setPagina(0);
  }

  const buscarPagina = useCallback(async (p: number) => {
    const id = ++requisicao.current;
    setCarregando(true);
    setErro(null);
    try {
      const r = await carregar({ busca: buscaAtiva, limit: PAGINA, offset: p * PAGINA });
      if (id !== requisicao.current) return;
      setLinhas(r.linhas);
      setTotal(r.total);
      setTotalGeral(r.totalGeral);
    } catch {
      if (id === requisicao.current) setErro('Não foi possível carregar o recorte.');
    } finally {
      if (id === requisicao.current) setCarregando(false);
    }
  }, [carregar, buscaAtiva]);

  useEffect(() => {
    if (!aberto) return;
    buscarPagina(pagina);
    // Página nova começa do topo, não onde a anterior parou.
    listaRef.current?.scrollTo({ top: 0 });
  }, [aberto, pagina, buscarPagina]);

  // Estado zerado ao fechar: reabrir em outra marca não deve mostrar o resto
  // da anterior por um instante.
  useEffect(() => {
    if (aberto) return;
    setLinhas([]);
    setTotal(0);
    setTotalGeral(0);
    setPagina(0);
    setBusca('');
    setBuscaAtiva('');
    setErro(null);
  }, [aberto]);

  // Esc fecha; enquanto aberto, a página atrás não rola junto.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', onKey);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto, onFechar]);

  async function baixar() {
    setExportando(true);
    setErro(null);
    try {
      // Busca TODAS as linhas do recorte, não as que estão na tela — senão o
      // arquivo sai com as 100 visíveis em vez das milhares do filtro.
      const todas = await exportar({ busca: buscaAtiva });
      const corpo = todas.map((linha) => {
        const obj: Record<string, string | number> = {};
        for (const c of colunas) obj[c.label] = c.valor(linha);
        return obj;
      });

      // Quem exportou: a planilha circula por e-mail e some do contexto.
      let usuario = '';
      try {
        const { data } = await getSupabaseClient().auth.getSession();
        usuario = data.session?.user?.email ?? '';
      } catch { /* sem sessão o arquivo sai sem essa linha */ }

      const agora = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const procedencia =
        `${todas.length.toLocaleString('pt-BR')} registro(s) · exportado em ${agora}` +
        (usuario ? ` por ${usuario}` : '');

      // Bloco de procedência antes dos dados. Sem isso a planilha chega na
      // caixa de alguém e ninguém sabe de que filtro ela saiu.
      //   1  tela — marca
      //   2  filtros aplicados
      //   3  volume, data e autor
      //   4  (vazia)
      //   5  cabeçalho das colunas
      const cabecalho = [
        [tela ? `${tela} — ${titulo}` : titulo],
        [recorte],
        [procedencia],
        [],
      ];
      const LINHA_CABECALHO = cabecalho.length + 1; // 1-based, onde entram os rótulos

      const ws = XLSX.utils.aoa_to_sheet(cabecalho);
      XLSX.utils.sheet_add_json(ws, corpo, { origin: `A${LINHA_CABECALHO}` });

      const ultimaColuna = XLSX.utils.encode_col(Math.max(colunas.length - 1, 0));

      // Mescla cada linha do bloco de procedência ao longo de todas as colunas,
      // para o texto não ser cortado pela borda da coluna A.
      ws['!merges'] = cabecalho
        .map((_, i) => ({ s: { r: i, c: 0 }, e: { r: i, c: Math.max(colunas.length - 1, 0) } }))
        .filter((_, i) => cabecalho[i].length > 0);

      // Filtro automático na linha de rótulos: quem receber já abre e filtra.
      ws['!autofilter'] = {
        ref: `A${LINHA_CABECALHO}:${ultimaColuna}${LINHA_CABECALHO + corpo.length}`,
      };

      // Largura pelo maior conteúdo da coluna, com teto para nome não estourar.
      ws['!cols'] = colunas.map((c) => {
        const maior = corpo.reduce(
          (max, linha) => Math.max(max, String(linha[c.label] ?? '').length),
          c.label.length,
        );
        return { wch: Math.min(Math.max(maior + 2, 10), 42) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recorte');
      XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
    } catch {
      setErro('Não foi possível gerar o arquivo.');
    } finally {
      setExportando(false);
    }
  }

  if (!aberto) return null;

  // A tabela mostra só as colunas de tela; o Excel leva todas (ver somenteExport).
  const colunasTela = colunas.filter((c) => !c.somenteExport);

  const filtrado = total !== totalGeral;
  const totalPaginas = Math.max(Math.ceil(total / PAGINA), 1);
  const inicio = pagina * PAGINA;
  const fim = inicio + linhas.length;

  return (
    // z abaixo do PrimeiroAcessoGate (z-200): se a barreira de senha aparecer,
    // ela tem que ficar por cima de tudo.
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Recorte detalhado — ${titulo}`}
        className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">{titulo}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{recorte}</p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filtros do recorte + busca */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          {filtros}
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome ou CRM"
              className="w-56 rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lista */}
        <div ref={listaRef} className="min-h-0 flex-1 overflow-auto">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : linhas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Inbox className="h-6 w-6 text-slate-300" />
              Nenhum registro neste recorte.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-white text-xs text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
                <tr>
                  {colunasTela.map((c) => (
                    <th key={c.chave} className={`px-4 py-2.5 font-medium ${c.className ?? ''}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhas.map((linha, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {colunasTela.map((c) => (
                      <td key={c.chave} className={`px-4 py-2 text-slate-700 ${c.className ?? ''}`}>
                        {c.valor(linha)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
          <div className="text-xs text-slate-500">
            {carregando || total === 0 ? (
              '—'
            ) : (
              <>
                <span className="font-medium text-slate-700">
                  {(inicio + 1).toLocaleString('pt-BR')}–{fim.toLocaleString('pt-BR')}
                </span>{' '}
                de <span className="font-medium text-slate-700">{total.toLocaleString('pt-BR')}</span>
                {filtrado && <> · {totalGeral.toLocaleString('pt-BR')} no total</>}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina((p) => Math.max(p - 1, 0))}
                  disabled={pagina === 0 || carregando}
                  aria-label="Página anterior"
                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[5.5rem] text-center text-xs tabular-nums text-slate-500">
                  {(pagina + 1).toLocaleString('pt-BR')} de {totalPaginas.toLocaleString('pt-BR')}
                </span>
                <button
                  onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas - 1))}
                  disabled={pagina >= totalPaginas - 1 || carregando}
                  aria-label="Próxima página"
                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <Button size="sm" onClick={baixar} disabled={exportando || total === 0}>
              {exportando ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              {exportando ? 'Gerando…' : 'Exportar'}
            </Button>
          </div>
        </div>

        {erro && (
          <div className="border-t border-rose-200 bg-rose-50 px-5 py-2 text-xs text-rose-700">{erro}</div>
        )}
      </div>
    </div>
  );
}
