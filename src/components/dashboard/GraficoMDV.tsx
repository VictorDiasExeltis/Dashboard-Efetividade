'use client';

import { Users } from 'lucide-react';
import { LineChartCard, type LineChartCardConfig } from './charts/LineChartCard';

const config: LineChartCardConfig = {
  icon: Users,
  accent: {
    icon: 'text-emerald-600',
    loader: 'text-emerald-500',
    emptyBg: 'bg-emerald-50',
    emptyIcon: 'text-emerald-400',
    retryBg: 'bg-blue-600',
    retryHoverBg: 'hover:bg-blue-700',
  },

  titleBase: 'MVD',
  loadingTitle: 'MVD por Distrito',
  loadingDescription: 'Carregando média de visitas diárias...',
  loadingMessage: 'Calculando médias...',
  descriptionPrefix: 'Evolução da Média de Visita Diária',
  emptyStateMessage: 'Utilize o filtro de "Distrito" no topo para detalhar o MVD por setor.',

  rpcName: 'get_mdv_dinamico',
  errorPrefix: 'Erro ao buscar MDV',
  computeValue: (row) => {
    if (!row.total_dias || row.total_dias <= 0) return 0;
    return Math.round((row.total_visitas / row.total_dias) * 10) / 10;
  },

  yDomain: [6, 12],
  yTicks: [6, 7.5, 9, 10.5, 12],
  yTickFormatter: (v) => v.toFixed(1),
  tooltipFormatter: (v) => `${v.toFixed(1)} visitas`,
  labelFormatValue: (v) => v.toFixed(1),
  labelWidth: 34,
  referenceLine: { y: 10.8, label: 'Meta 10.8' },
  lineColors: [
    '#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b',
    '#ec4899', '#6366f1', '#14b8a6', '#94a3b8', '#a855f7', '#f43f5e', '#0ea5e9',
  ],
};

export function GraficoMDV() {
  return <LineChartCard config={config} />;
}
