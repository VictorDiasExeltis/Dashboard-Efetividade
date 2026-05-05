"use client";

import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Database, TrendingUp, Target, Users, Map, PieChart, BarChart } from 'lucide-react';

const chartData = [
  { ciclo: 'Ciclo 1', cobertura: 75, marketShare: 12 },
  { ciclo: 'Ciclo 2', cobertura: 82, marketShare: 14 },
  { ciclo: 'Ciclo 3', cobertura: 88, marketShare: 15 },
  { ciclo: 'Ciclo 4', cobertura: 95, marketShare: 18 },
  { ciclo: 'Ciclo 5', cobertura: 92, marketShare: 17 },
  { ciclo: 'Ciclo 6', cobertura: 98, marketShare: 21 },
];

const TeamNode = ({ name, role, icon, isRoot = false, isSmall = false }: any) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    whileHover={{ y: -5 }}
    className={`${isSmall ? 'w-48 p-4' : 'w-64 p-6'} bg-white rounded-2xl border ${isRoot ? 'border-[#0047AB] border-2 shadow-blue-100 shadow-lg' : 'border-blue-100 shadow-sm'} flex flex-col items-center text-center relative z-10 transition-shadow hover:shadow-md`}
  >
    <div className={`${isSmall ? 'w-10 h-10' : 'w-14 h-14'} rounded-full bg-blue-50 flex items-center justify-center mb-3`}>
      {icon}
    </div>
    <h3 className={`${isSmall ? 'text-sm' : 'text-lg'} font-bold text-gray-900 leading-tight`}>{name}</h3>
    <p className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-[#0047AB] font-medium uppercase tracking-wider mt-1`}>{role}</p>
  </motion.div>
);

export default function ApresentacaoExecutiva() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Sincroniza o scroll do container com a animação
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-83.333%"]);
  
  // Suaviza o movimento horizontal
  const smoothX = useSpring(x, {
    stiffness: 50,
    damping: 20,
    restDelta: 0.001
  });
  
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [chartLoaded, setChartLoaded] = useState(false);

  return (
    <div 
      ref={containerRef} 
      className="h-screen w-screen overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth bg-white selection:bg-[#0047AB] selection:text-white"
    >
      <div className="relative h-[600vh]">
        {/* Snap Points (Invisible anchors) */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-screen snap-start" />
          ))}
        </div>

        {/* Sticky Container para os Slides */}
        <div className="sticky top-0 h-screen w-screen overflow-hidden">
          {/* Progress Bar */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-1 bg-[#0047AB] origin-left z-50"
            style={{ scaleX }}
          />

          <motion.div style={{ x: smoothX }} className="flex h-full w-[600vw]">
            {/* 1. HERO SECTION */}
            <section className="w-screen h-screen flex-shrink-0 flex flex-col items-center justify-center relative overflow-hidden px-6">
            <motion.div 
              className="absolute inset-0 z-0 opacity-10"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.1 }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
               <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0047AB] rounded-full mix-blend-multiply filter blur-3xl"></div>
               <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl"></div>
            </motion.div>

            <div className="z-10 text-center max-w-4xl">
              <motion.h1 
                className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 0.8 }}
              >
                Inteligência de Mercado: <br className="hidden md:block"/>
                <span className="text-[#0047AB]">A Ciência por trás da Performance</span>
              </motion.h1>
              <motion.p 
                className="text-xl md:text-2xl text-gray-500 font-light"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Foco em Efetividade e Saúde Feminina
              </motion.p>
              <div className="mt-16 flex flex-col items-center gap-2 text-gray-400">
                <span className="text-xs uppercase tracking-widest animate-pulse">Role para navegar</span>
                <div className="w-px h-12 bg-gradient-to-b from-[#0047AB] to-transparent"></div>
              </div>
            </div>
          </section>

          {/* 2. COMO A ÁREA FUNCIONA */}
          <section className="w-screen h-screen flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 px-6 md:px-12">
            <div className="max-w-7xl w-full mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Como Operamos</h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Transformamos dados brutos de fontes como Close Up e PDVs de Varejo em estratégias acionáveis para o time de campo.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { title: 'Auditoria', icon: <Database className="w-8 h-8" />, desc: 'Captação robusta e validação de dados de mercado (Close Up, IQVIA).' },
                  { title: 'Modelagem', icon: <Activity className="w-8 h-8" />, desc: 'Estruturação de dados e criação de algoritmos preditivos.' },
                  { title: 'Insight', icon: <PieChart className="w-8 h-8" />, desc: 'Tradução de dados complexos em inteligência de negócios clara.' },
                  { title: 'Execução', icon: <Target className="w-8 h-8" />, desc: 'Direcionamento tático para as equipes de vendas em campo.' },
                ].map((pillar, index) => (
                  <motion.div
                    key={index}
                    className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="w-16 h-16 bg-blue-50 text-[#0047AB] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      {pillar.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{pillar.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{pillar.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. O TIME (Hierarquia em Árvore) */}
          <section className="w-screen h-screen flex-shrink-0 flex flex-col items-center justify-center bg-white px-6 relative overflow-hidden">
            <div className="max-w-7xl w-full mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900">A Engrenagem</h2>
                <p className="text-xl text-gray-500 mt-2">Estrutura Estratégica de Inteligência</p>
              </div>

              <div className="relative flex flex-col items-center scale-90 md:scale-100 origin-center">
                <TeamNode 
                  name="Presidente" 
                  role="Diretoria Executiva" 
                  icon={<Target className="w-6 h-6 text-[#0047AB]" />} 
                  isRoot
                />
                
                <motion.div 
                  initial={{ height: 0 }}
                  whileInView={{ height: 40 }}
                  className="w-px bg-[#0047AB]/30"
                />

                <TeamNode 
                  name="Gestora" 
                  role="Gerência de Inteligência" 
                  icon={<Users className="w-6 h-6 text-[#0047AB]" />} 
                />

                <div className="relative w-full flex flex-col items-center">
                  <motion.div 
                    initial={{ height: 0 }}
                    whileInView={{ height: 30 }}
                    className="w-px bg-[#0047AB]/30"
                  />
                  
                  <div className="relative w-full max-w-4xl">
                    <motion.div 
                      initial={{ width: 0, left: '50%' }}
                      whileInView={{ width: '100%', left: '0%' }}
                      className="absolute top-0 h-px bg-[#0047AB]/30"
                    />
                    
                    <div className="flex justify-between w-full pt-px">
                      <div className="flex flex-col items-center w-1/2">
                        <motion.div 
                          initial={{ height: 0 }}
                          whileInView={{ height: 30 }}
                          className="w-px bg-[#0047AB]/30"
                        />
                        <TeamNode 
                          name="Analista 1" 
                          role="Inteligência de Mercado" 
                          icon={<Activity className="w-6 h-6 text-[#0047AB]" />} 
                        />
                        <motion.div 
                          initial={{ height: 0 }}
                          whileInView={{ height: 30 }}
                          className="w-px bg-[#0047AB]/30"
                        />
                        <TeamNode 
                          name="Estagiário" 
                          role="Suporte Operacional" 
                          icon={<PieChart className="w-6 h-6 text-[#0047AB]" />} 
                          isSmall
                        />
                      </div>

                      <div className="flex flex-col items-center w-1/2">
                        <motion.div 
                          initial={{ height: 0 }}
                          whileInView={{ height: 30 }}
                          className="w-px bg-[#0047AB]/30"
                        />
                        <TeamNode 
                          name="Analista 2" 
                          role="SFE & Efetividade" 
                          icon={<TrendingUp className="w-6 h-6 text-[#0047AB]" />} 
                        />
                        <motion.div 
                          initial={{ height: 0 }}
                          whileInView={{ height: 30 }}
                          className="w-px bg-[#0047AB]/30"
                        />
                        <TeamNode 
                          name="Jovem Aprendiz" 
                          role="Suporte Administrativo" 
                          icon={<Database className="w-6 h-6 text-[#0047AB]" />} 
                          isSmall
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. EFETIVIDADE DE VENDAS */}
          <section className="w-screen h-screen flex-shrink-0 flex flex-col items-center justify-center bg-gray-50 px-6 md:px-12">
            <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row items-center gap-16">
              <motion.div 
                className="md:w-1/2"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Sales Force Effectiveness</h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Otimizamos a performance em campo através de direcionamento inteligente. A análise contínua de rotas e cobertura garante eficiência máxima.
                </p>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Mapeamento de Território' },
                    { step: '2', title: 'Segmentação de Painel Médico' },
                    { step: '3', title: 'Otimização de Roteiro (Routing)' },
                    { step: '4', title: 'Análise de MDV e Cobertura' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center p-4 bg-white rounded-xl border border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-[#0047AB] text-white flex items-center justify-center font-bold mr-4">
                        {item.step}
                      </div>
                      <span className="font-semibold text-gray-800">{item.title}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
              <div className="md:w-1/2 relative h-[400px] w-full rounded-2xl bg-white border border-blue-100 shadow-xl flex items-center justify-center overflow-hidden">
                <Map className="w-48 h-48 text-blue-50 absolute opacity-30" strokeWidth={0.5} />
                <motion.div 
                  className="w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center absolute top-10 left-10"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <Target className="w-6 h-6 text-[#0047AB]" />
                </motion.div>
                <motion.div 
                  className="w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center absolute bottom-10 right-10"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, delay: 1 }}
                >
                  <Map className="w-6 h-6 text-[#0047AB]" />
                </motion.div>
              </div>
            </div>
          </section>

          {/* 5. DASHBOARD INTERATIVO */}
          <section className="w-screen h-screen flex-shrink-0 flex flex-col items-center justify-center bg-gray-900 text-white px-6 md:px-12">
            <div className="max-w-7xl w-full mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                onViewportEnter={() => {
                  if(!chartLoaded) {
                    setTimeout(() => setChartLoaded(true), 1000);
                  }
                }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Evolução de Cobertura e Share</h2>
                <p className="text-gray-400">Impacto direto da inteligência na performance executiva.</p>
              </motion.div>

              <div className="bg-gray-800 p-6 md:p-8 rounded-3xl border border-gray-700 shadow-2xl h-[450px] flex flex-col">
                <div className="flex-1 relative w-full h-full">
                  {!chartLoaded ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-12 h-12 border-4 border-gray-600 border-t-[#0047AB] rounded-full mb-4"
                      />
                      <p className="text-gray-400">Carregando dados...</p>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0047AB" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#0047AB" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                          <XAxis dataKey="ciclo" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
                          <Area type="monotone" dataKey="cobertura" stroke="#0047AB" fill="url(#colorC)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 6. ENCERRAMENTO */}
          <section className="w-screen h-screen flex-shrink-0 flex flex-col items-center justify-center bg-white px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">Prontos para o Futuro</h2>
              <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto">
                A Inteligência de Mercado direciona a performance de amanhã.
              </p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#0047AB] text-white px-10 py-5 rounded-full font-bold text-lg shadow-xl flex items-center mx-auto group"
              >
                Abrir Sessão de Q&A
                <BarChart className="ml-3 w-6 h-6 group-hover:rotate-12 transition-transform" />
              </motion.button>
            </motion.div>
          </section>

        </motion.div>
      </div>
    </div>
  </div>
  );
}
