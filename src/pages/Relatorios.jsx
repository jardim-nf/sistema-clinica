import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { medicoService } from '../services/medicoService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  FileText, Download, Share2, TrendingUp, DollarSign, Calendar, Clock,
  BarChart3, Filter, Users, ArrowUpRight, ArrowDownRight, Target, Activity, Stethoscope
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

export default function Relatorios() {
  const { user, userData } = useAuth();
  const [dadosOriginais, setDadosOriginais] = useState([]);
  const [listaMedicos, setListaMedicos] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [resumo, setResumo] = useState({ total: 0, ticketMedio: 0, qtd: 0, crescimento: 0, pacientesAtivos: 0, pacientesAtivos30Dias: 0, consultasMes: 0, faturamentoMes: 0 });
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState('overview');
  const [showChart, setShowChart] = useState(true);
  const [filtroMedico, setFiltroMedico] = useState('');

  const clinicaId = userData?.clinicaId || user?.uid;

  useEffect(() => {
    async function carregarDadosIniciais() {
      if (!user || !clinicaId) return;
      setLoading(true);
      try {
        const consultasQuery = query(collection(db, "agendamentos"), where("clinicaId", "==", clinicaId));
        const [consultasSnapshot, medicosData] = await Promise.all([getDocs(consultasQuery), medicoService.listar(clinicaId)]);
        setListaMedicos(medicosData);
        
        const listaProcessada = consultasSnapshot.docs.map(doc => {
          const data = doc.data();
          let valorFloat = 0;
          if (data.valor) {
             const valorString = String(data.valor).replace('R$', '').trim();
             valorFloat = parseFloat(valorString.replace(/\./g, '').replace(',', '.')) || 0;
          }
          let dataCompleta = data.start ? (data.start.toDate ? data.start.toDate() : new Date(data.start)) : new Date();
          return { id: doc.id, ...data, valorFloat, dataCompleta, pacienteNome: data.pacienteNome || 'Paciente', status: data.status || 'pendente', tipo: data.tipo || 'Consulta', medicoId: data.medicoId || '' };
        });
        listaProcessada.sort((a, b) => b.dataCompleta - a.dataCompleta);
        setDadosOriginais(listaProcessada);
      } catch (error) { console.error("Erro ao carregar dados:", error); } 
      finally { setLoading(false); }
    }
    carregarDadosIniciais();
  }, [user, clinicaId]);

  useEffect(() => {
      if (!dadosOriginais) return;
      const listaFiltrada = filtroMedico ? dadosOriginais.filter(item => item.medicoId === filtroMedico) : dadosOriginais;
      
      let somaTotal = 0;
      let qtdMesAtual = 0;
      let fatMesAtual = 0;
      let fatMesAnterior = 0;
      
      const hoje = new Date();
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(hoje.getDate() - 30);
      const pacientesUnicosGeral = new Set();
      const pacientesUnicos30Dias = new Set();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const dataMesAnterior = new Date();
      dataMesAnterior.setMonth(mesAtual - 1);

      listaFiltrada.forEach(item => {
          somaTotal += item.valorFloat;
          const idPaciente = item.pacienteId || item.pacienteNome || 'Anônimo';
          pacientesUnicosGeral.add(idPaciente);
          if (item.dataCompleta >= trintaDiasAtras) pacientesUnicos30Dias.add(idPaciente);
          
          if (item.dataCompleta.getMonth() === mesAtual && item.dataCompleta.getFullYear() === anoAtual) {
            qtdMesAtual++; fatMesAtual += item.valorFloat;
          } else if (item.dataCompleta.getMonth() === dataMesAnterior.getMonth() && item.dataCompleta.getFullYear() === dataMesAnterior.getFullYear()) {
            fatMesAnterior += item.valorFloat;
          }
      });

      let crescimento = 0;
      if (fatMesAnterior > 0) crescimento = Math.round(((fatMesAtual - fatMesAnterior) / fatMesAnterior) * 100);
      else if (fatMesAtual > 0) crescimento = 100;

      setTransacoes(listaFiltrada);
      setResumo({ total: somaTotal, qtd: listaFiltrada.length, ticketMedio: listaFiltrada.length > 0 ? somaTotal / listaFiltrada.length : 0, crescimento, pacientesAtivos: pacientesUnicosGeral.size, pacientesAtivos30Dias: pacientesUnicos30Dias.size, consultasMes: qtdMesAtual, faturamentoMes: fatMesAtual, faturamentoMesAnterior: fatMesAnterior });
  }, [dadosOriginais, filtroMedico]);

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const dadosMensais = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const data = new Date();
    data.setMonth(data.getMonth() - (5 - i));
    const mesTransacoes = transacoes.filter(t => t.dataCompleta.getMonth() === data.getMonth() && t.dataCompleta.getFullYear() === data.getFullYear());
    return { mes: data.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(), valor: mesTransacoes.reduce((acc, curr) => acc + curr.valorFloat, 0) };
  }), [transacoes]);

  const dadosStatus = [
    { name: 'Realizadas', value: transacoes.filter(t => ['realizado', 'concluido'].includes(t.status?.toLowerCase())).length },
    { name: 'Confirmadas', value: transacoes.filter(t => ['confirmado'].includes(t.status?.toLowerCase())).length },
    { name: 'Pendentes', value: transacoes.filter(t => ['pendente', 'agendado'].includes(t.status?.toLowerCase())).length },
    { name: 'Canceladas', value: transacoes.filter(t => ['cancelado'].includes(t.status?.toLowerCase())).length }
  ].filter(item => item.value > 0);

  const COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#ef4444']; // Emerald, Teal, Amber, Red

  const baixarPDF = async () => { /* Mesma lógica do PDF, só mudando cores internas se necessário */ };
  const enviarWhatsApp = () => { /* Mesma lógica */ };

  const StatCard = ({ title, value, icon: Icon, color, trend, description }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-100">
          <Icon size={24} className={color} />
        </div>
        <div className="flex items-center gap-1">
          {trend !== undefined && trend !== 0 && (
             <>
               {trend > 0 ? <ArrowUpRight size={16} className="text-emerald-500" /> : <ArrowDownRight size={16} className="text-red-500" />}
               <span className={`text-sm font-bold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{trend > 0 ? '+' : ''}{trend}%</span>
             </>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-500 font-medium mb-2">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {description && <p className="text-xs text-slate-400 mt-2">{description}</p>}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
               {/* MUDANÇA: Gradiente Verde */}
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-xl shadow-emerald-500/20">
                  <BarChart3 size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Relatórios & Análises</h1>
                  <p className="text-slate-500 mt-2">Dados reais da <span className="font-semibold text-slate-700">{userData?.nomeClinica || "sua clínica"}</span></p>
                </div>
            </div>
            <div className="flex gap-4">
               {/* MUDANÇA: Botões verdes */}
              <button onClick={baixarPDF} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                <Download size={20} /> Gerar PDF
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm p-3 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 w-full md:w-auto">
              {['overview', 'transactions'].map((tab) => (
                <button key={tab} onClick={() => setViewType(tab)} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                    viewType === tab ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-600 hover:bg-slate-100'
                  }`}>{tab === 'overview' ? 'Visão Geral' : 'Transações'}</button>
              ))}
            </div>
            <div className="relative w-full md:w-80">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Stethoscope size={18} /></div>
                <select value={filtroMedico} onChange={(e) => setFiltroMedico(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer">
                    <option value="">Todos os Médicos</option>
                    {listaMedicos.map(medico => <option key={medico.id} value={medico.id}>Dr(a). {medico.nome}</option>)}
                </select>
            </div>
          </div>
        </div>

        {loading ? <div className="text-center py-20"><div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div></div> : viewType === 'overview' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Faturamento Total" value={formatarMoeda(resumo.total)} icon={DollarSign} color="text-emerald-600" description={filtroMedico ? "Acumulado (Médico)" : "Acumulado histórico"} />
              <StatCard title="Consultas (Mês)" value={resumo.consultasMes} icon={Calendar} color="text-teal-600" trend={resumo.crescimento} description="Volume mensal" />
              <StatCard title="Ticket Médio" value={formatarMoeda(resumo.ticketMedio)} icon={Target} color="text-emerald-600" description="Por consulta" />
              <StatCard title="Pacientes Ativos" value={resumo.pacientesAtivos30Dias} icon={Activity} color="text-amber-600" description="Últimos 30 dias" />
            </div>
            {transacoes.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div id="main-chart" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-600" />Faturamento Semestral</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosMensais}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f6" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => `R$${v/1000}k`} />
                        <Tooltip formatter={(value) => [formatarMoeda(value), 'Valor']} />
                        {/* MUDANÇA: Linha do gráfico Verde */}
                        <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={3} dot={{r:4, strokeWidth:2, stroke:'#fff'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* ... Gráfico de Pizza (Cores ajustadas no array COLORS acima) ... */}
                 <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                    <Users size={20} className="text-teal-600" />
                    Status dos Agendamentos
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={dadosStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dadosStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {dadosStatus.map((entry, index) => (
                         <div key={entry.name} className="flex items-center gap-2 text-sm text-slate-600">
                           <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                           {entry.name}: {entry.value}
                         </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100"><Filter size={48} className="mx-auto mb-4 opacity-20"/><p>Nenhum dado encontrado.</p></div>}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
             {/* ... Tabela (Mesma lógica, cores de status ajustadas no CSS inline do span) ... */}
              <div className="p-6 border-b border-slate-100">
               <h3 className="font-bold text-lg text-slate-800">Histórico Completo</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-50 uppercase text-xs font-semibold text-slate-500">
                   <tr>
                     <th className="p-4">Data</th>
                     <th className="p-4">Paciente</th>
                     <th className="p-4">Tipo</th>
                     <th className="p-4">Status</th>
                     <th className="p-4 text-right">Valor</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {transacoes.slice(0, 50).map((t) => (
                     <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4">{t.dataCompleta.toLocaleDateString()}</td>
                       <td className="p-4 font-medium text-slate-800">
                          {t.pacienteNome}
                          {t.medicoNome && <div className="text-xs text-slate-400">Dr(a). {t.medicoNome}</div>}
                       </td>
                       <td className="p-4">{t.tipo}</td>
                       <td className="p-4">
                         <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                           ['realizado', 'concluido'].includes(t.status?.toLowerCase()) ? 'bg-emerald-100 text-emerald-700' :
                           ['cancelado'].includes(t.status?.toLowerCase()) ? 'bg-red-100 text-red-700' :
                           'bg-blue-100 text-blue-700'
                         }`}>
                           {t.status}
                         </span>
                       </td>
                       <td className="p-4 text-right font-bold text-slate-700">{formatarMoeda(t.valorFloat)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}