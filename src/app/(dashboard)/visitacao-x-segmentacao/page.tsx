'use client';

import React, { Suspense } from 'react';
import { SegmentacaoFilters } from '@/src/components/dashboard/SegmentacaoFilters';
import { Card, CardContent } from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/src/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

import { Button } from '@/src/components/ui/button';
import { MoreHorizontal, FileText, X, Shield, Target, UserCheck, Eye, HelpCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useState } from 'react';

// Dummy data based on the image
const dummyData = [
  { label: 'PROTEGER', sim: '83%', simNum: 1033, nao: '17%', naoNum: 212 },
  { label: 'CONQUISTAR', sim: '79%', simNum: 676, nao: '21%', naoNum: 180 },
  { label: 'MANTER', sim: '81%', simNum: 1703, nao: '19%', naoNum: 400 },
  { label: 'OBSERVAR', sim: '77%', simNum: 333, nao: '23%', naoNum: 99 },
  { label: 'SEM SEGMENTAÇÃO', sim: '74%', simNum: 95, nao: '26%', naoNum: 33 },
];

const totalData = { sim: '79%', simNum: 3840, nao: '21%', naoNum: 924 };

interface SegmentacaoTableProps {
  productName: string;
}

const SegmentacaoTable: React.FC<SegmentacaoTableProps> = ({ productName }) => {

  return (
    <>
      <Card className="overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">{productName}</h3>
            <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">Número de Médicos</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 border-b border-slate-200 text-xs hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 font-medium">Segmentação</th>
                <th className="px-4 py-3 font-medium">Sim</th>
                <th className="px-4 py-3 font-medium">Não</th>
              </tr>
            </thead>
            <tbody>
              {dummyData.map((row, i) => (
                <tr key={i} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{row.simNum.toLocaleString('pt-BR')}</span>
                      <span className="text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{row.sim}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{row.naoNum.toLocaleString('pt-BR')}</span>
                      <span className="text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{row.nao}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3">Total Geral</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{totalData.simNum.toLocaleString('pt-BR')}</span>
                    <span className="text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{totalData.sim}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{totalData.naoNum.toLocaleString('pt-BR')}</span>
                    <span className="text-xs font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{totalData.nao}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </>
  );
};

export default function VisitacaoXSegmentacao() {
  const products = [
    "FAMÍLIA REGENESIS",
    "SLINDA",
    "GYNOTRAN",
    "GYMPRO",
    "HEMOLIP",
    "UMMA",
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Visitação x Segmentação</h1>
          <p className="text-sm text-slate-500 mt-1">
            Qualidade do painel e controle de segmentação.
          </p>
        </div>
        <div className="w-full xl:w-auto">
          <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-md" />}>
            <SegmentacaoFilters />
          </Suspense>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            title: "Faz TH e Pré-Natal",
            value: "1.245",
            description: "Médicos nesta classificação",
            icon: Shield,
            color: "text-blue-600",
            bg: "bg-blue-50"
          },
          {
            title: "Não Faz TH e Pré-Natal",
            value: "856",
            description: "Médicos nesta classificação",
            icon: Target,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
          },
          {
            title: "Médico de TH",
            value: "2.103",
            description: "Médicos nesta classificação",
            icon: UserCheck,
            color: "text-amber-600",
            bg: "bg-amber-50"
          },
          {
            title: "Médico de Pré-Natal",
            value: "432",
            description: "Médicos nesta classificação",
            icon: Eye,
            color: "text-purple-600",
            bg: "bg-purple-50"
          },
          {
            title: "Sem Classificação",
            value: "128",
            description: "Médicos não classificados",
            icon: HelpCircle,
            color: "text-slate-600",
            bg: "bg-slate-100"
          }
        ].map((kpi) => (
          <Card key={kpi.title} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
                <p className="text-xs text-slate-400">{kpi.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product) => (
          <SegmentacaoTable key={product} productName={product} />
        ))}
      </div>
    </div>
  );
}
