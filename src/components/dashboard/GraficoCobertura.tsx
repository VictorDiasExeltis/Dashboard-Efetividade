'use client';

import { TrendingUp } from 'lucide-react';
import { LineChartCard, type LineChartCardConfig } from './charts/LineChartCard';

const config: LineChartCardConfig = {
  icon: TrendingUp,
  accent: {
    icon: 'text-blue-600',
    loader: 'text-blue-500',
    emptyBg: 'bg-blue-50',
    emptyIcon: 'text-blue-400',
    retryBg: 'bg-blue-600',
    retryHoverBg: 'hover:bg-blue-700',
  },

  titleBase: 'Cobertura',
  loadingTitle: 'Cobertura por Distrito',
  loadingDescription: 'Carregando tendências por distrito...',
  loadingMessage: 'Calculando trajetórias...',
  descriptionPrefix: 'Evolução da cobertura de médicos visitados',
  emptyStateMessage: 'Para ver os setores, utilize o filtro de "Distrito" no topo da página.',

  rpcName: 'get_cobertura_dinamica',
  errorPrefix: 'Erro ao buscar cobertura',
  computeValue: (row) => {
    if (!row.total_painel || row.total_painel <= 0) return 0;
    return Math.round((row.total_visitas / row.total_painel) * 1000) / 10;
  },

  yDomain: [50, 100],
  yTicks: [50, 60, 70, 80, 90, 100],
  yTickFormatter: (v) => `${v}%`,
  tooltipFormatter: (v) => `${v.toFixed(1)}%`,
  labelFormatValue: (v) => `${v.toFixed(1)}%`,
  labelWidth: 36,
  referenceLine: { y: 90, label: 'Meta 90%' },
  lineColors: [
    '#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b',
    '#ec4899', '#6366f1', '#14b8a6', '#94a3b8', '#a855f7', '#f43f5e', '#0ea5e9',
  ],
};

export function GraficoCobertura() {
  return <LineChartCard config={config} />;
}
