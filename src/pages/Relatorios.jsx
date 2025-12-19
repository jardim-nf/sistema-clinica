import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  FileText, Download, Share2, TrendingUp, DollarSign, Calendar, Clock,
  BarChart3, Filter, Users, ArrowUpRight, ArrowDownRight, Target, RefreshCw,
  CheckCircle, XCircle, Eye, EyeOff, CalendarDays, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [transacoes, setTransacoes] = useState([]);
  const [resumo, setResumo] = useState({ 
    total: 0, 
    ticketMedio: 0, 
    qtd: 0,
    crescimento: 0,
    pacientesAtivos: 0,
    pacientesAtivos30Dias: 0,
    consultasMes: 0,
    faturamentoMes: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [viewType, setViewType] = useState('overview');
  const [showChart, setShowChart] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    tipo: 'all',
    medico: 'all'
  });

  // Garante que temos um ID para buscar (da clínica ou do usuário logado)
  const clinicaId = userData?.clinicaId || user?.uid;

  useEffect(() => {
    async function carregarDados() {
      if (!user || !clinicaId) return;
      
      setLoading(true);
      try {
        // 1. Buscar todas as consultas
        const consultasQuery = query(
          collection(db, "agendamentos"), 
          where("clinicaId", "==", clinicaId)
        );
        const consultasSnapshot = await getDocs(consultasQuery);
        
        let somaTotal = 0;
        const hoje = new Date();
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(hoje.getDate() - 30);

        const pacientesUnicosGeral = new Set();
        const pacientesUnicos30Dias = new Set();
        
        let qtdMesAtual = 0;
        let fatMesAtual = 0;
        let fatMesAnterior = 0;

        // Datas para comparação de mês
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        const dataMesAnterior = new Date();
        dataMesAnterior.setMonth(mesAtual - 1);
        
        const lista = consultasSnapshot.docs.map(doc => {
          const data = doc.data();
          
          // --- TRATAMENTO ROBUSTO DE VALORES ---
          let valorFloat = 0;
          if (data.valor) {
             const valorString = String(data.valor).replace('R$', '').trim();
             // Remove pontos de milhar e troca vírgula por ponto
             valorFloat = parseFloat(valorString.replace(/\./g, '').replace(',', '.')) || 0;
          }
          
          somaTotal += valorFloat;

          // --- TRATAMENTO DE DATAS ---
          // Verifica se é timestamp do firestore ou string
          let dataCompleta;
          if (data.start?.toDate) {
             dataCompleta = data.start.toDate(); 
          } else if (data.start) {
             dataCompleta = new Date(data.start);
          } else {
             dataCompleta = new Date();
          }

          // Identificação do Paciente
          const idPaciente = data.pacienteId || data.pacienteNome || 'Anônimo';
          
          // Lógica de Pacientes
          pacientesUnicosGeral.add(idPaciente);
          if (dataCompleta >= trintaDiasAtras) {
            pacientesUnicos30Dias.add(idPaciente);
          }

          // Lógica de Mês Atual vs Anterior
          if (dataCompleta.getMonth() === mesAtual && dataCompleta.getFullYear() === anoAtual) {
            qtdMesAtual++;
            fatMesAtual += valorFloat;
          } else if (dataCompleta.getMonth() === dataMesAnterior.getMonth() && dataCompleta.getFullYear() === dataMesAnterior.getFullYear()) {
            fatMesAnterior += valorFloat;
          }

          return {
            id: doc.id,
            ...data,
            valorFloat,
            dataCompleta,
            pacienteNome: data.pacienteNome || 'Paciente',
            status: data.status || 'pendente',
            tipo: data.tipo || 'Consulta'
          };
        });

        // Ordenar por data (mais recente primeiro)
        lista.sort((a, b) => b.dataCompleta - a.dataCompleta);

        // Cálculo de crescimento
        let crescimento = 0;
        if (fatMesAnterior > 0) {
          crescimento = Math.round(((fatMesAtual - fatMesAnterior) / fatMesAnterior) * 100);
        } else if (fatMesAtual > 0) {
          crescimento = 100;
        }

        setTransacoes(lista);
        setResumo({
          total: somaTotal,
          qtd: lista.length,
          ticketMedio: lista.length > 0 ? somaTotal / lista.length : 0,
          crescimento,
          pacientesAtivos: pacientesUnicosGeral.size, // Total histórico
          pacientesAtivos30Dias: pacientesUnicos30Dias.size, // Ativos reais (30d)
          consultasMes: qtdMesAtual,
          faturamentoMes: fatMesAtual,
          faturamentoMesAnterior: fatMesAnterior
        });

      } catch (error) {
        console.error("Erro ao carregar relatório:", error);
      } finally {
        setLoading(false);
      }
    }
    
    carregarDados();
  }, [user, clinicaId]);

  const formatarMoeda = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // Dados para gráficos
  const dadosMensais = Array.from({ length: 6 }, (_, i) => {
    const data = new Date();
    data.setMonth(data.getMonth() - (5 - i));
    
    const mesTransacoes = transacoes.filter(t => 
      t.dataCompleta.getMonth() === data.getMonth() && 
      t.dataCompleta.getFullYear() === data.getFullYear()
    );
    
    return {
      mes: data.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
      valor: mesTransacoes.reduce((acc, curr) => acc + curr.valorFloat, 0),
      consultas: mesTransacoes.length
    };
  });

  const dadosStatus = [
    { name: 'Realizadas', value: transacoes.filter(t => ['realizado', 'Realizado', 'concluido'].includes(t.status)).length },
    { name: 'Confirmadas', value: transacoes.filter(t => ['confirmado', 'Confirmado'].includes(t.status)).length },
    { name: 'Pendentes', value: transacoes.filter(t => ['pendente', 'Pendente', 'agendado'].includes(t.status)).length },
    { name: 'Canceladas', value: transacoes.filter(t => ['cancelado', 'Cancelado'].includes(t.status)).length }
  ].filter(item => item.value > 0);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  // --- GERAR PDF BLINDADO ---
  const baixarPDF = async () => {
    try {
      const doc = new jsPDF();
      const nomeClinica = userData?.nomeClinica || "CLÍNICA MÉDICA";
      
      // Cabeçalho
      doc.setFontSize(22);
      doc.setTextColor(59, 130, 246);
      doc.text("RELATÓRIO FINANCEIRO", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(nomeClinica, 105, 28, { align: "center" });
      doc.text(`Gerado em: ${new Date().toLocaleString()}`, 105, 33, { align: "center" });
      
      doc.setDrawColor(200);
      doc.line(14, 38, 196, 38);

      // Métricas principais (Com proteção contra NULL/Undefined)
      const metrics = [
        ["Faturamento Total", formatarMoeda(resumo.total)],
        ["Total de Consultas", String(resumo.qtd || 0)],
        ["Ticket Médio", formatarMoeda(resumo.ticketMedio)],
        ["Faturamento Mês Atual", formatarMoeda(resumo.faturamentoMes)],
        ["Pacientes Ativos (30d)", String(resumo.pacientesAtivos30Dias || 0)]
      ];
      
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Resumo Geral", 14, 48);

      autoTable(doc, {
        startY: 52,
        head: [['Indicador', 'Valor']],
        body: metrics,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 11, cellPadding: 3 }
      });
      
      // Tabela de transações
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Detalhamento de Consultas", 14, 20);
      
      const tableData = transacoes.slice(0, 100).map(t => [
        t.dataCompleta.toLocaleDateString('pt-BR'),
        t.pacienteNome?.substring(0, 25) || 'Não inf.',
        t.tipo || 'Consulta',
        t.status || '-',
        formatarMoeda(t.valorFloat)
      ]);
      
      autoTable(doc, {
        startY: 25,
        head: [['Data', 'Paciente', 'Tipo', 'Status', 'Valor']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        columnStyles: { 4: { halign: 'right' } }
      });
      
      // Tentar capturar gráfico
      if (showChart && document.getElementById('main-chart')) {
        try {
          const chartElement = document.getElementById('main-chart');
          const canvas = await html2canvas(chartElement, { scale: 1.5, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          
          doc.addPage();
          doc.text("Análise Gráfica", 14, 20);
          const pdfWidth = doc.internal.pageSize.getWidth() - 28;
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          doc.addImage(imgData, 'PNG', 14, 30, pdfWidth, pdfHeight);
        } catch (e) {
          console.warn("Gráfico não gerado no PDF:", e);
        }
      }
      
      doc.save(`Relatorio_${nomeClinica.replace(/\s+/g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Houve um erro ao gerar o PDF. Verifique o console.');
    }
  };

  // Enviar WhatsApp
  const enviarWhatsApp = () => {
    const msg = `*📊 RELATÓRIO - ${userData?.nomeClinica || 'CLÍNICA'}*\n` +
                `💰 Faturamento: ${formatarMoeda(resumo.faturamentoMes)} (Mês)\n` +
                `📅 Consultas: ${resumo.consultasMes} (Mês)\n` +
                `👥 Pacientes Ativos: ${resumo.pacientesAtivos30Dias}\n` +
                `📈 Total Acumulado: ${formatarMoeda(resumo.total)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Componente de Card
  const StatCard = ({ title, value, icon: Icon, color, trend, description }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-100">
          <Icon size={24} className={color} />
        </div>
        <div className="flex items-center gap-1">
          {trend !== undefined && trend !== 0 && (
             <>
               {trend > 0 ? <ArrowUpRight size={16} className="text-emerald-500" /> : <ArrowDownRight size={16} className="text-red-500" />}
               <span className={`text-sm font-bold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                 {trend > 0 ? '+' : ''}{trend}%
               </span>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/20">
                  <BarChart3 size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                    Relatórios & Análises
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Dados reais da <span className="font-semibold text-slate-700">{userData?.nomeClinica || "sua clínica"}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={baixarPDF}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                <Download size={20} /> Gerar PDF
              </button>
              <button 
                onClick={enviarWhatsApp}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Share2 size={20} /> Compartilhar
              </button>
            </div>
          </div>

          {/* Navegação e Filtros */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm p-2 mb-8">
            <div className="flex gap-2">
              {['overview', 'transactions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setViewType(tab)}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                    viewType === tab
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab === 'overview' ? 'Visão Geral' : 'Transações'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-500 font-medium">Processando dados...</p>
          </div>
        ) : viewType === 'overview' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                title="Faturamento Total"
                value={formatarMoeda(resumo.total)}
                icon={DollarSign}
                color="text-emerald-600"
                description="Acumulado histórico"
              />
              <StatCard 
                title="Consultas (Mês)"
                value={resumo.consultasMes}
                icon={Calendar}
                color="text-blue-600"
                trend={resumo.crescimento}
                description="Volume mensal"
              />
              <StatCard 
                title="Ticket Médio"
                value={formatarMoeda(resumo.ticketMedio)}
                icon={Target}
                color="text-violet-600"
                description="Por consulta"
              />
              <StatCard 
                title="Pacientes Ativos"
                value={resumo.pacientesAtivos30Dias}
                icon={Activity}
                color="text-amber-600"
                description="Últimos 30 dias"
              />
            </div>

            {/* Gráficos */}
            {transacoes.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div id="main-chart" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    Faturamento Semestral
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosMensais}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f6" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => `R$${v/1000}k`} />
                        <Tooltip formatter={(value) => [formatarMoeda(value), 'Valor']} />
                        <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={3} dot={{r:4, strokeWidth:2, stroke:'#fff'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                    <Users size={20} className="text-violet-600" />
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
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100">
               <h3 className="font-bold text-lg text-slate-800">Histórico Completo</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-50 uppercase text-xs font-semibold text-slate-500">
                   <tr>
                     <th className="p-4">Data</th>
                     <th className="p-4">Paciente</th>
                     <th className="p-4">Status</th>
                     <th className="p-4 text-right">Valor</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {transacoes.slice(0, 50).map((t) => (
                     <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4">{t.dataCompleta.toLocaleDateString()}</td>
                       <td className="p-4 font-medium text-slate-800">{t.pacienteNome}</td>
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