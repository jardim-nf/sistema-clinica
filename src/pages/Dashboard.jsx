// src/pages/Dashboard.jsx - FINALIZADO: Estabilidade (debounce) e Fluxo de Dados (Correto no Frontend)

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { Link } from 'react-router-dom';
import { Users, Calendar, DollarSign, Clock, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Componente de carregamento (Skeleton) para os cards
const SkeletonCard = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse h-32">
    <div className="flex gap-4">
      <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        <div className="h-8 bg-slate-200 rounded w-3/4"></div>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({ pacientes: 0, hoje: 0, faturamento: 0 });
  const [graficoData, setGraficoData] = useState([]);
  const [proximas, setProximas] = useState([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  
  // Garante que temos o ID da clínica para buscar os dados corretos
  const clinicaId = userData?.clinicaId;

  useEffect(() => {
    if (!clinicaId) return;
    
    async function loadData() {
      try {
        const [resumo, grafico, listaProximas] = await Promise.all([
            dashboardService.getResumo(clinicaId), // Busca resumo (incluindo a contagem de pacientes)
            dashboardService.getGraficoFinanceiro(clinicaId),
            dashboardService.getProximasConsultas(clinicaId)
        ]);
        setStats(resumo);
        setGraficoData(grafico);
        setProximas(listaProximas);
      } catch (error) { 
        console.error("Erro ao carregar dashboard:", error); 
      } finally { 
        setLoading(false); 
      }
    }
    loadData();
  }, [clinicaId]);

  const formatMoney = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (!userData) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="p-4 md:p-6 pb-20 space-y-6 md:space-y-8 animate-in fade-in duration-500 overflow-y-auto h-full">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{greeting}, {userData.nome?.split(' ')[0]}.</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            Resumo de <span className="font-semibold text-blue-600">{userData?.nomeClinica || "sua clínica"}</span>.
          </p>
        </div>
        <div className="bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-200 text-xs md:text-sm font-medium text-slate-600 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Online
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {loading ? <><SkeletonCard/><SkeletonCard/><SkeletonCard/></> : (
            <>
                {/* Card Pacientes */}
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-20 h-20 bg-blue-50 rounded-bl-full -mr-4 -mt-4"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Users size={24} /></div>
                        <div><p className="text-xs font-bold text-slate-400 uppercase">Pacientes</p><h3 className="text-2xl md:text-3xl font-extrabold text-slate-800">{stats.pacientes}</h3></div>
                    </div>
                </div>
                {/* Card Agenda Hoje */}
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-20 h-20 bg-orange-50 rounded-bl-full -mr-4 -mt-4"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Calendar size={24} /></div>
                        <div><p className="text-xs font-bold text-slate-400 uppercase">Hoje</p><h3 className="text-2xl md:text-3xl font-extrabold text-slate-800">{stats.hoje}</h3></div>
                    </div>
                </div>
                {/* Card Faturamento */}
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-20 h-20 bg-green-50 rounded-bl-full -mr-4 -mt-4"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl"><DollarSign size={24} /></div>
                        <div><p className="text-xs font-bold text-slate-400 uppercase">Faturamento</p><h3 className="text-2xl md:text-3xl font-extrabold text-slate-800">{formatMoney(stats.faturamento)}</h3></div>
                    </div>
                </div>
            </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* GRÁFICO FINANCEIRO (Estabilizado) */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><TrendingUp className="text-blue-500" size={20}/> Financeiro</h3>
                <span className="text-[10px] md:text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded">6 meses</span>
            </div>
            
            <div className="w-full h-[300px] min-h-[300px] relative">
                {loading ? (
                    <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl"></div>
                ) : (
                    graficoData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" debounce={1}>
                            <AreaChart data={graficoData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f6"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10}/>
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`}/>
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value) => [formatMoney(value), "Faturamento"]}/>
                                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{r: 6, strokeWidth: 0}}/>
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                            Sem dados financeiros suficientes.
                        </div>
                    )
                )}
            </div>
        </div>

        {/* PRÓXIMAS CONSULTAS */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[400px] md:h-auto">
            <div className="p-5 md:p-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Activity className="text-orange-500" size={20}/> Próximos</h3>
                <Link to="/agenda" className="text-sm text-blue-600 font-bold hover:underline">Ver tudo</Link>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl"/>)}</div> 
                ) : proximas.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400"><Calendar size={32} className="mb-2 opacity-20"/><p className="text-sm">Vazio.</p></div>
                ) : (
                    <div className="space-y-3">
                        {proximas.map((item) => (
                            <div key={item.id} className="p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100">
                                <div className="flex justify-between mb-1">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                        {new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR').slice(0,5)}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Clock size={12}/> {item.hora}</span>
                                </div>
                                <p className="font-bold text-slate-700 truncate">{item.paciente}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-slate-50">
                <Link to="/agenda" className="block w-full py-3 bg-slate-900 text-white text-center rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition">Novo Agendamento</Link>
            </div>
        </div>
      </div>
    </div>
  );
}