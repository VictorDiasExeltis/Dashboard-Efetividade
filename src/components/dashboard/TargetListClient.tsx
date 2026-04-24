'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  ArrowUpDown,
  Stethoscope,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  PhoneCall,
  MapPin,
  CheckCircle2,
  AlertCircle,
  UserX,
  History,
  Users,
  Star
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Card, CardContent } from "@/src/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { DashboardFilters } from './DashboardFilters';
import { getAvailableSetores } from '@/src/app/actions';

// Mock data for the Target List
const mockDoctors = [
  {
    id: '1',
    crm: '12345-SP',
    name: 'Dra. Ana Silva',
    specialty: 'Ginecologia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
    slinda: 'A',
    regenesis: 'A',
    gynpro: 'B',
    gynotran: '-',
    hemolip: 'C',
    score: 'Alto Valor',
    lastVisit: 'Mais de 60 dias',
    city: 'São Paulo',
  },
  {
    id: '2',
    crm: '45678-RJ',
    name: 'Dr. Carlos Mendes',
    specialty: 'Obstetrícia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    slinda: 'B',
    regenesis: 'C',
    gynpro: 'A',
    gynotran: 'A',
    hemolip: '-',
    score: 'Alto Valor',
    lastVisit: 'Nunca visitado',
    city: 'Rio de Janeiro',
  },
  {
    id: '3',
    crm: '98765-MG',
    name: 'Dra. Beatriz Costa',
    specialty: 'Ginecologia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beatriz',
    slinda: '-',
    regenesis: '-',
    gynpro: 'C',
    gynotran: 'B',
    hemolip: 'A',
    score: 'Baixo Valor',
    lastVisit: 'Mais de 90 dias',
    city: 'Belo Horizonte',
  },
  {
    id: '4',
    crm: '34567-PR',
    name: 'Dr. Fernando Souza',
    specialty: 'Ginecologia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fernando',
    slinda: 'A',
    regenesis: 'B',
    gynpro: '-',
    gynotran: 'C',
    hemolip: 'B',
    score: 'Médio Valor',
    lastVisit: 'Mais de 30 dias',
    city: 'Curitiba',
  },
  {
    id: '5',
    crm: '76543-SP',
    name: 'Dra. Mariana Lima',
    specialty: 'Obstetrícia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mariana',
    slinda: 'A',
    regenesis: 'A',
    gynpro: 'A',
    gynotran: 'A',
    hemolip: 'A',
    score: 'Alto Valor',
    lastVisit: 'Nunca visitado',
    city: 'Campinas',
  },
  {
    id: '6',
    crm: '23456-RS',
    name: 'Dr. Ricardo Alves',
    specialty: 'Ginecologia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ricardo',
    slinda: 'C',
    regenesis: 'C',
    gynpro: '-',
    gynotran: '-',
    hemolip: '-',
    score: 'Baixo Valor',
    lastVisit: 'Mais de 120 dias',
    city: 'Porto Alegre',
  },
  {
    id: '7',
    crm: '87654-BA',
    name: 'Dra. Juliana Rocha',
    specialty: 'Ginecologia',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juliana',
    slinda: 'B',
    regenesis: 'A',
    gynpro: 'B',
    gynotran: 'A',
    hemolip: 'B',
    score: 'Alto Valor',
    lastVisit: 'Mais de 45 dias',
    city: 'Salvador',
  },
];

const SegmentacaoBadge = ({ value }: { value: string }) => {
  if (!value || value === '-') return <span className="text-slate-300">-</span>;
  
  const colors: Record<string, string> = {
    'A': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'B': 'bg-blue-100 text-blue-700 border-blue-200',
    'C': 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <span className={cn(
      "inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold border",
      colors[value] || 'bg-slate-100 text-slate-700 border-slate-200'
    )}>
      {value}
    </span>
  );
};

const ScoreBadge = ({ score }: { score: string }) => {
  const isAlto = score === 'Alto Valor';
  const isBaixo = score === 'Baixo Valor';
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      isAlto ? "bg-purple-50 text-purple-700 border-purple-200" : 
      isBaixo ? "bg-slate-50 text-slate-600 border-slate-200" :
      "bg-sky-50 text-sky-700 border-sky-200"
    )}>
      {isAlto ? <TrendingUp className="w-3 h-3" /> : 
       isBaixo ? <TrendingDown className="w-3 h-3" /> : 
       <Stethoscope className="w-3 h-3" />}
      {score}
    </div>
  );
};

export function TargetListClient() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [availableSetores, setAvailableSetores] = useState<string[]>([]);
  const searchParams = useSearchParams();
  
  const estrutura = searchParams.get('estrutura') || 'Distrito';
  const distritoRaw = searchParams.get('distrito') || 'Todos';
  const distrito = estrutura === 'Setor' && distritoRaw === 'Todos' ? 'MG/CO' : distritoRaw;

  useEffect(() => {
    const fetchSetores = async () => {
      const setores = await getAvailableSetores(distrito);
      setAvailableSetores(setores);
    };
    fetchSetores();
  }, [distrito]);

  const toggleRow = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRows(newSet);
  };

  const toggleAll = () => {
    if (selectedRows.size === mockDoctors.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(mockDoctors.map(d => d.id)));
    }
  };

  const filteredDoctors = mockDoctors.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.crm.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Médicos não Visitados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Médicos não visitados e oportunidades prioritárias de cobertura.
          </p>
        </div>
        
        <DashboardFilters availableSetores={availableSetores} />
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total sem Visita",
            value: "138",
            description: "Médicos no painel atual",
            icon: Users,
            color: "text-slate-600",
            bg: "bg-slate-100"
          },
          {
            title: "Alto Valor Crítico",
            value: "42",
            description: "Médicos 'Alto Valor' sem visita",
            icon: Star,
            color: "text-purple-600",
            bg: "bg-purple-50"
          },
          {
            title: "Nunca Visitados",
            value: "15%",
            description: "Dos médicos nesta lista",
            icon: UserX,
            color: "text-red-600",
            bg: "bg-red-50"
          },
          {
            title: "Tempo Médio",
            value: "75 dias",
            description: "Desde a última visita",
            icon: History,
            color: "text-amber-600",
            bg: "bg-amber-50"
          }
        ].map((kpi) => (
          <Card key={kpi.title} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <AlertCircle className="h-4 w-4 text-slate-300" />
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

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nome ou CRM..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-900">{filteredDoctors.length}</span> médicos encontrados
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-[40px]">
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.size === mockDoctors.length && mockDoctors.length > 0}
                      onChange={toggleAll}
                    />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium">Médico / CRM</th>
                <th className="px-4 py-3 font-medium text-center">Slinda</th>
                <th className="px-4 py-3 font-medium text-center">Regenesis</th>
                <th className="px-4 py-3 font-medium text-center">Gynpro</th>
                <th className="px-4 py-3 font-medium text-center">Gynotran</th>
                <th className="px-4 py-3 font-medium text-center">Hemolip</th>
                <th className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
                    Score
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDoctors.map((doc) => {
                const isSelected = selectedRows.has(doc.id);
                return (
                  <tr 
                    key={doc.id} 
                    className={cn(
                      "group transition-colors hover:bg-slate-50/80",
                      isSelected && "bg-blue-50/50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={isSelected}
                          onChange={() => toggleRow(doc.id)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={doc.avatar} 
                          alt={doc.name} 
                          className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{doc.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="font-medium text-slate-600">{doc.crm}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            {doc.specialty}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><SegmentacaoBadge value={doc.slinda} /></td>
                    <td className="px-4 py-3 text-center"><SegmentacaoBadge value={doc.regenesis} /></td>
                    <td className="px-4 py-3 text-center"><SegmentacaoBadge value={doc.gynpro} /></td>
                    <td className="px-4 py-3 text-center"><SegmentacaoBadge value={doc.gynotran} /></td>
                    <td className="px-4 py-3 text-center"><SegmentacaoBadge value={doc.hemolip} /></td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={doc.score} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Registrar Visita">
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              Ver no Mapa
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <PhoneCall className="w-4 h-4 text-slate-400" />
                              Ligar para Consultório
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <CalendarDays className="w-4 h-4 text-slate-400" />
                              Agendar Visita
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {filteredDoctors.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Nenhum médico encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-sm">
          <div className="text-slate-500">
            Mostrando <span className="font-medium text-slate-900">1</span> a <span className="font-medium text-slate-900">{filteredDoctors.length}</span> de <span className="font-medium text-slate-900">{mockDoctors.length}</span> registros
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>Anterior</Button>
            <Button variant="outline" size="sm" disabled>Próxima</Button>
          </div>
        </div>
      </div>
      
      {/* Floating Action Bar (visible when items selected) */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-8 z-50">
          <span className="font-medium">{selectedRows.size} selecionado(s)</span>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-slate-800 rounded-full h-8 px-3">
              Criar Roteiro
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-slate-800 rounded-full h-8 px-3">
              Exportar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
