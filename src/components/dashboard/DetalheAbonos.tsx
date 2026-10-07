'use client';

// Faixa de detalhe do bloco de abonos: o que tem dentro da fatia clicada.
//
// Mora aqui, e não dentro do GraficoAbonos, porque ocupa a largura inteira do
// bloco — abaixo do donut E da tabela. A observação é texto livre que o
// representante escreve ao pedir o abono, e na coluna estreita do donut ela
// ficava espremida em duas linhas cortadas.
//
// Os dados vêm prontos do GraficoAbonos (ele já consultou o banco com os
// filtros da tela). Refazer a consulta aqui duplicaria o trabalho e abriria
// espaço pros dois divergirem.

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { MOTIVO_DEMAIS } from '@/src/lib/abonos';

// Um abono individual, como o donut o leu.
export interface AbonoLinha {
  motivo: string;      // normalizado (o que a fatia mostra)
  motivoBruto: string; // como veio da origem — delata a fusão da família médica
  dias: number;
  data: string | null;
  rep: string | null;
  setor: string | null;
  obs: string | null;  // texto livre da origem — o conteúdo real de "OUTROS"
}

const fmtData = (iso: string | null) => {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a.slice(2)}`;
};

const fmtDias = (d: number) => (Math.round(d * 10) / 10).toFixed(1).replace('.', ',');

/**
 * Abre a fatia clicada. Duas formas, porque as perguntas são diferentes:
 *
 * - No balde ("Demais motivos") o que falta saber é QUAIS motivos estão lá
 *   dentro, então lista os motivos com seus subtotais.
 * - Num motivo de verdade o que falta saber é QUEM, QUANDO e POR QUÊ, então
 *   lista os abonos um por um. Quando o texto da origem difere do rótulo da
 *   fatia — caso da família médica, que é fundida — mostra o texto original,
 *   para a fusão ficar auditável na tela.
 */
export function DetalheAbonos({
  motivo, linhas, cauda, onFechar,
}: {
  motivo: string;
  linhas: AbonoLinha[];
  cauda: string[];
  onFechar: () => void;
}) {
  const ehBalde = motivo === MOTIVO_DEMAIS;

  const { itens, porMotivo, dias, comTexto } = useMemo(() => {
    const alvo = new Set(ehBalde ? cauda : [motivo]);
    const sel = linhas.filter((l) => alvo.has(l.motivo));

    const mapa = new Map<string, { dias: number; n: number }>();
    sel.forEach((l) => {
      const e = mapa.get(l.motivo) ?? { dias: 0, n: 0 };
      e.dias += l.dias; e.n += 1;
      mapa.set(l.motivo, e);
    });

    return {
      itens: sel.slice().sort((a, b) => b.dias - a.dias || (b.data ?? '').localeCompare(a.data ?? '')),
      porMotivo: Array.from(mapa.entries()).sort((a, b) => b[1].dias - a[1].dias),
      dias: sel.reduce((acc, l) => acc + l.dias, 0),
      comTexto: sel.filter((l) => l.obs).length,
    };
  }, [linhas, motivo, cauda, ehBalde]);

  return (
    <div className="border-t border-slate-200 bg-slate-50/50">
      <div className="flex items-start justify-between gap-4 px-6 py-3 border-b border-slate-200 bg-white">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 leading-tight">{motivo}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {fmtDias(dias)} dias · {itens.length} {itens.length === 1 ? 'abono' : 'abonos'}
            {ehBalde
              ? ` · ${porMotivo.length} motivos`
              : comTexto > 0 && ` · ${comTexto} com justificativa`}
          </p>
        </div>
        <button
          onClick={onFechar}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <X className="h-3.5 w-3.5" /> fechar
        </button>
      </div>

      <div className="max-h-[320px] overflow-y-auto">
        {ehBalde ? (
          // Balde: grade de motivos. Cabe em três colunas na largura cheia.
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0 px-6 py-2">
            {porMotivo.map(([m, v]) => (
              <div key={m} className="flex items-baseline gap-3 py-1.5 border-b border-slate-200/70">
                <span className="text-xs text-slate-700 flex-1 min-w-0 truncate" title={m}>{m}</span>
                <span className="text-xs text-slate-400 tabular-nums shrink-0">{v.n}</span>
                <span className="text-xs font-semibold text-slate-900 tabular-nums shrink-0 w-12 text-right">
                  {fmtDias(v.dias)}d
                </span>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-500 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-2 font-medium w-[280px]">Representante</th>
                <th className="px-3 py-2 font-medium w-[140px]">Setor</th>
                <th className="px-3 py-2 font-medium w-[80px]">Data</th>
                <th className="px-3 py-2 font-medium w-[60px] text-right">Dias</th>
                <th className="px-3 py-2 pr-6 font-medium">Justificativa</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((l, i) => (
                <tr key={i} className="border-b border-slate-200/70 last:border-0 hover:bg-white/80">
                  <td className="px-6 py-2 font-medium text-slate-800 whitespace-nowrap">{l.rep ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{l.setor ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500 tabular-nums whitespace-nowrap">{fmtData(l.data)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">
                    {fmtDias(l.dias)}
                  </td>
                  <td className="px-3 py-2 pr-6 text-slate-600">
                    {l.obs ?? <span className="text-slate-300">—</span>}
                    {/* A origem do rótulo, quando a fatia fundiu motivos diferentes. */}
                    {l.motivoBruto && l.motivoBruto.toUpperCase() !== motivo && (
                      <span className="ml-2 text-[10px] text-slate-400 whitespace-nowrap">
                        ({l.motivoBruto.toLowerCase()})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {itens.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                  Nenhum abono neste motivo.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
