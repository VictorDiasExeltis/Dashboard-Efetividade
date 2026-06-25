'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Lock, History, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Card, CardContent } from '@/src/components/ui/card';
import { useLayout } from '@/src/context/LayoutContext';
import { CARGAS } from '@/src/lib/cargas/config';
import { CargaUploadCard } from '@/src/components/cargas/CargaUploadCard';
import {
  temAcessoCarga,
  getCargasStatus,
  getLogCargas,
  type CargaStatus,
  type LogCarga,
} from '@/src/app/actions/cargas';

const fmtDataHora = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const NOME_CARGA: Record<string, string> = Object.fromEntries(CARGAS.map((c) => [c.id, c.nome]));

export default function CentralDeCargas() {
  const { setHeaderState } = useLayout();
  const [acesso, setAcesso] = useState<boolean | null>(null);
  const [statusList, setStatusList] = useState<CargaStatus[]>([]);
  const [logs, setLogs] = useState<LogCarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>(CARGAS[0].id);

  useEffect(() => {
    setHeaderState({
      title: 'Central de Cargas',
      subtitle: 'Atualize as bases do dashboard sem mexer no banco direto',
    });
    return () => setHeaderState({});
  }, [setHeaderState]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([getCargasStatus(), getLogCargas(25)]);
      setStatusList(s);
      setLogs(l);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    temAcessoCarga().then((ok) => {
      if (cancelled) return;
      setAcesso(ok);
      if (ok) refresh();
      else setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refresh]);

  // Carregando o gate de acesso.
  if (acesso === null) {
    return (
      <div className="p-6 flex items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Sem acesso.
  if (!acesso) {
    return (
      <div className="p-6">
        <Card className="border border-slate-200 shadow-sm bg-white max-w-lg mx-auto mt-12">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-800">Acesso restrito</h3>
            <p className="text-sm text-slate-500 mt-1">
              A Central de Cargas grava nas bases do sistema e está liberada apenas para usuários autorizados.
              Fale com o administrador se precisar de acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusById = (id: string) => statusList.find((s) => s.id === id);
  const selecionada = CARGAS.find((c) => c.id === tab);

  return (
    <div className="p-6 space-y-6">
      {/* Abas — uma por carga, sem rolagem (quebram linha quando não cabem) */}
      <div className="border-b border-slate-200 flex flex-wrap gap-x-1">
        {CARGAS.map((c) => {
          const ativo = tab === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                ativo ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              {c.nome}
            </button>
          );
        })}
      </div>

      {/* Carga selecionada */}
      {selecionada && (
        <CargaUploadCard key={selecionada.id} spec={selecionada} status={statusById(selecionada.id)} onDone={refresh} />
      )}

      {/* Histórico — exibido em todas as abas */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 p-4 border-b border-slate-200 bg-white">
          <History className="h-4 w-4 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Histórico de cargas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Carga</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Arquivo</th>
                <th className="px-4 py-3 font-medium text-center">Linhas</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="bg-white border-b border-slate-100 last:border-0">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-full max-w-[120px] bg-slate-200 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr className="bg-white">
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    Nenhuma carga registrada ainda.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDataHora(log.criado_em)}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{NOME_CARGA[log.tabela_destino] ?? log.tabela_destino}</td>
                    <td className="px-4 py-3 text-slate-600">{log.usuario_email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={log.arquivo_nome ?? ''}>{log.arquivo_nome ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{log.linhas_afetadas.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-center">
                      {log.status === 'sucesso' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Sucesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-rose-50 text-rose-700" title={log.mensagem ?? ''}>
                          <AlertTriangle className="h-3.5 w-3.5" /> Erro
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
