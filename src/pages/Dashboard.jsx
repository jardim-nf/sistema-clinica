import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { Link } from 'react-router-dom';
import { 
  Users, Calendar, DollarSign, Clock, 
  TrendingUp, Activity, Loader2, 
  ArrowUpRight, ArrowDownRight, 
  CalendarDays, Stethoscope, PieChart,
  TrendingDown, TrendingUp as TrendingUpIcon,
  ChevronRight, UserCheck, AlertCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Componente Badge de Status
const StatusBadge = ({ type, value }) => {
  const config = {
    up: { icon: ArrowUpRight, color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
    down: { icon: ArrowDownRight, color: 'bg-red-100 text-red-700', border: 'border-red-200' },
    neutral: { icon: TrendingUpIcon, color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' }
  };
  
  const { icon: Icon, color, border } = config[type] || config.neutral;
  
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${color} ${border} border`}>
      <Icon size={12} />
      <span>{value}%</span>
    </div>
  );
};

export default function Dashboard() {
  const { userData, user } = useAuth();
  
  // Estado inicial
  const [stats, setStats] = useState({ 
    pacientes: 0, 
    hoje: 0, 
    faturamento: 0,
    taxaConversao: 0,
    crescimento: { pacientes: 0, faturamento: 0, consultas: 0 }
  });
  
  const [graficoData, setGraficoData] = useState([]);
  const [proximas, setProximas] = useState([]);
  const [pacientesRecentes, setPacientesRecentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  
  // IMPORTANTE: Usa user.uid como identificador principal
  const idUsuario = user?.uid;

  useEffect(() => {
    if (!idUsuario) return;
    
    async function loadData() {
      setLoading(true);
      try {
        // Busca todos os dados em paralelo usando o ID correto
        const [resumo, grafico, listaProximas, recentes] = await Promise.all([
          dashboardService.getResumo(idUsuario),
          dashboardService.getGraficoFinanceiro(idUsuario),
          dashboardService.getProximasConsultas(idUsuario),
          dashboardService.getPacientesRecentes(idUsuario)
        ]);

        setStats(resumo);
        setGraficoData(grafico);
        setProximas(listaProximas);
        setPacientesRecentes(recentes);
      } catch (error) { 
        console.error("Erro crítico no dashboard:", error); 
      } finally { 
        setLoading(false); 
      }
    }
    loadData();
  }, [idUsuario]);

  const formatMoney = (val) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short' 
      }).replace('.', '');
    } catch {
      return dateStr;
    }
  };

  // Loading State
  if (loading && !stats.pacientes) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <Loader2 className="animate-spin text-blue-600" size={48} />
    </div>
  );

  const metricCards = [
    {
      title: 'Pacientes',
      value: stats.pacientes,
      icon: Users,
      color: 'blue',
      trend: stats.crescimento?.pacientes || 0,
      description: 'Total cadastrados'
    },
    {
      title: 'Consultas Hoje',
      value: stats.hoje,
      icon: Calendar,
      color: 'emerald',
      trend: stats.crescimento?.consultas || 0,
      description: 'Agendadas para hoje'
    },
    {
      title: 'Faturamento',
      value: formatMoney(stats.faturamento),
      icon: DollarSign,
      color: 'violet',
      trend: stats.crescimento?.faturamento || 0,
      description: 'Acumulado Total'
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats.taxaConversao}%`,
      icon: UserCheck,
      color: 'amber',
      trend: 5,
      description: 'Consultas realizadas'
    }
  ];

  const colors = {
    blue: { bg: 'from-blue-500 to-cyan-500', icon: 'text-blue-600', card: 'bg-gradient-to-br from-blue-50 to-cyan-50' },
    emerald: { bg: 'from-emerald-500 to-green-500', icon: 'text-emerald-600', card: 'bg-gradient-to-br from-emerald-50 to-green-50' },
    violet: { bg: 'from-violet-500 to-purple-500', icon: 'text-violet-600', card: 'bg-gradient-to-br from-violet-50 to-purple-50' },
    amber: { bg: 'from-amber-500 to-orange-500', icon: 'text-amber-600', card: 'bg-gradient-to-br from-amber-50 to-orange-50' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Principal */}
        <div className="mb-8 md:mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/20">
                  <Stethoscope size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight">
                    {greeting}, <span className="text-blue-600">{userData?.nome?.split(' ')[0]}</span>
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Resumo completo da <span className="font-semibold text-slate-700">{userData?.nomeClinica || "sua clínica"}</span>
                  </p>
                </div>
              </div>
              
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {metricCards.map((card, index) => (
                  <div key={index} className={`${colors[card.color].card} p-4 rounded-2xl border border-slate-200/50 backdrop-blur-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <card.icon size={20} className={colors[card.color].icon} />
                      </div>
                      <StatusBadge type={card.trend > 0 ? 'up' : card.trend < 0 ? 'down' : 'neutral'} value={card.trend} />
                    </div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{card.title}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                    <div className="h-1 w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent mt-2"></div>
                    <p className="text-xs text-slate-500 mt-2">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Coluna da Esquerda: Gráfico (2/3 da largura) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm p-6">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-bold text-xl text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                      <TrendingUp size={20} className="text-blue-600" />
                    </div>
                    Desempenho Financeiro
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">Análise dos últimos 6 meses</p>
                </div>
              </div>
              
              <div className="w-full h-[320px]">
                {graficoData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graficoData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [formatMoney(value), "Faturamento"]}
                      />
                      <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <TrendingDown size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Sem dados financeiros recentes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna da Direita: Listas (1/3 da largura) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Próximas Consultas */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg">
                    <Activity size={18} className="text-emerald-600" />
                  </div>
                  Próximas Consultas
                </h3>
                <Link to="/agenda" className="text-sm text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1">
                  Ver tudo <ChevronRight size={16} />
                </Link>
              </div>
              
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {proximas.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Nenhuma consulta hoje</p>
                  </div>
                ) : (
                  proximas.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl hover:bg-slate-50 border border-slate-200/50 transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                            {item.paciente.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{item.paciente}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                {formatDate(item.dataIso)}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock size={10} /> {item.hora}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pacientes Recentes */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-violet-100 to-purple-100 rounded-lg">
                    <UserCheck size={18} className="text-violet-600" />
                  </div>
                  Pacientes Recentes
                </h3>
              </div>
              
              <div className="p-4 space-y-3">
                {pacientesRecentes.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm">Nenhum paciente recente</div>
                ) : (
                  pacientesRecentes.map((paciente) => (
                    <div key={paciente.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center font-bold text-violet-600">
                        {paciente.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{paciente.nome}</p>
                        <p className="text-xs text-slate-500 truncate">{paciente.email || 'Sem e-mail'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}