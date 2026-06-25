'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Database,
  Clock,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  parseLinhas,
  TIPO_INFO,
  type CargaSpec,
  type ParseResult,
} from '@/src/lib/cargas/config';
import { commitFatoDiario, type CargaStatus } from '@/src/app/actions/cargas';

interface Props {
  spec: CargaSpec;
  status?: CargaStatus;
  onDone: () => void;
}

const fmtDataHora = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export function CargaUploadCard({ spec, status, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [parse, setParse] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setArquivoNome(null);
    setParse(null);
    setResultado(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function lerArquivo(file: File) {
    setResultado(null);
    setParsing(true);
    setArquivoNome(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });
      setParse(parseLinhas(raw, spec));
    } catch (e: any) {
      setParse({ ok: false, rows: [], erros: [`Não consegui ler o arquivo: ${e?.message ?? 'formato inválido'}.`], avisos: [], colunasEncontradas: [] });
    } finally {
      setParsing(false);
    }
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) lerArquivo(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) lerArquivo(f);
  }

  async function confirmar() {
    if (!parse?.ok) return;
    setCommitting(true);
    setResultado(null);
    try {
      // Fase 1: só a carga diária. Fase 2/3 adicionam novos ramos aqui.
      let res;
      if (spec.id === 'fato_diario') {
        res = await commitFatoDiario(parse.rows, arquivoNome ?? undefined);
      } else {
        res = { ok: false, linhas: 0, mensagem: 'Carga ainda não implementada.' };
      }
      setResultado({ ok: res.ok, msg: res.mensagem });
      if (res.ok) {
        setParse(null);
        if (inputRef.current) inputRef.current.value = '';
        onDone();
      }
    } catch (e: any) {
      setResultado({ ok: false, msg: e?.message ?? 'Erro ao gravar.' });
    } finally {
      setCommitting(false);
    }
  }

  const tipo = TIPO_INFO[spec.tipo];
  const preview = parse?.rows.slice(0, 5) ?? [];

  return (
    <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardContent className="p-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 shrink-0">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">{spec.nome}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500" title={tipo.texto}>
                  {tipo.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5 max-w-xl">{spec.descricao}</p>
            </div>
          </div>
        </div>

        {/* Colunas esperadas */}
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Colunas esperadas no arquivo</p>
          <div className="flex flex-wrap gap-1.5">
            {spec.colunas.map((c) => (
              <span
                key={c.campo}
                className={cn(
                  'text-[11px] px-2 py-1 rounded-md border',
                  c.obrigatoria ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-dashed border-slate-200 text-slate-400',
                )}
                title={`${c.label} · ${c.tipo}${c.obrigatoria ? ' · obrigatória' : ' · opcional'}`}
              >
                <span className="font-mono">{c.campo}</span>
                {!c.obrigatoria && <span className="ml-1 italic">(opcional)</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Última carga */}
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">{status?.totalLinhas ?? 0}</span> linhas hoje na tabela ·{' '}
          {status?.ultimaCarga ? (
            <span className="flex items-center gap-1.5">
              Última carga: {fmtDataHora(status.ultimaCarga.criado_em)} · {status.ultimaCarga.usuario_email ?? '—'} ·{' '}
              {status.ultimaCarga.status === 'sucesso' ? (
                <span className="text-emerald-600 font-medium">{status.ultimaCarga.linhas_afetadas} ✓</span>
              ) : (
                <span className="text-rose-600 font-medium">falhou</span>
              )}
            </span>
          ) : (
            <span className="italic">nenhuma carga registrada ainda</span>
          )}
        </div>

        {/* Carga ainda não habilitada (layout só) */}
        {!spec.implementado && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-6 text-center">
            <Clock className="h-6 w-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Carga ainda não habilitada — chega na Fase 2/3.</p>
          </div>
        )}

        {/* Zona de upload */}
        {spec.implementado && !parse && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'cursor-pointer rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onSelect}
              className="hidden"
            />
            {parsing ? (
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Lendo arquivo…
              </div>
            ) : (
              <>
                <UploadCloud className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
                <p className="text-xs text-slate-400 mt-1">CSV ou Excel (.xlsx, .xls)</p>
              </>
            )}
          </div>
        )}

        {/* Prévia + validação */}
        {parse && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-800">{arquivoNome}</span>
              </div>
              <button onClick={reset} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100" title="Descartar">
                <X className="h-4 w-4" />
              </button>
            </div>

            {parse.erros.length > 0 && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> {parse.erros.length} problema(s) — corrija e reenvie
                </p>
                <ul className="text-[11px] text-rose-600 space-y-0.5 list-disc list-inside">
                  {parse.erros.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
                {parse.colunasEncontradas.length > 0 && (
                  <p className="text-[10px] text-rose-500 mt-2">
                    Colunas lidas no arquivo: {parse.colunasEncontradas.join(', ')}
                  </p>
                )}
              </div>
            )}

            {parse.avisos.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5">
                <ul className="text-[11px] text-amber-700 space-y-0.5 list-disc list-inside">
                  {parse.avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            {preview.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      {spec.colunas.map((c) => (
                        <th key={c.campo} className="px-3 py-2 font-medium font-mono">{c.campo}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        {spec.colunas.map((c) => (
                          <td key={c.campo} className="px-3 py-1.5 text-slate-700">
                            {row[c.campo] == null ? <span className="text-slate-300">—</span> : String(row[c.campo])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                {parse.ok
                  ? <><span className="font-semibold text-slate-800">{parse.rows.length}</span> linha(s) válida(s) prontas para carregar</>
                  : 'Arquivo com erros — não é possível carregar.'}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={reset} disabled={committing}>Descartar</Button>
                <Button size="sm" onClick={confirmar} disabled={!parse.ok || committing}>
                  {committing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Gravando…</> : 'Confirmar carga'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div
            className={cn(
              'mt-4 rounded-md border p-3 flex items-center gap-2 text-sm',
              resultado.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700',
            )}
          >
            {resultado.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {resultado.msg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
