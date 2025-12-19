import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { agendaService } from '../services/agendaService';
import { financeiroService } from '../services/financeiroService';
import ModalDespesa from '../components/ModalDespesa';

import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, Clock, Filter, Plus, Search, 
  FileText, Loader2, Trash2, Edit, Download, Eye, EyeOff, PieChart,
  ArrowUpRight, ArrowDownRight, ChevronRight, CreditCard, Wallet,
  BarChart3, Target, RefreshCw, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';

export default function Financeiro() {
  const { userData } = useAuth();
  const { showToast } = useToast();
  
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewType, setViewType] = useState('list'); // 'list' or 'chart'
  const [showDetails, setShowDetails] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // 'day', 'week', 'month', 'year'
  const [filterType, setFilterType] = useState('all'); // 'all', 'receita', 'despesa'

  const clinicaId = userData?.clinicaId;

  const carregarDados = useCallback(async () => {
    if (!clinicaId) return;
    setLoading(true);
    try {
      const [agendamentos, listaDespesas] = await Promise.all([
        agendaService.listar(clinicaId),
        financeiroService.listarDespesas(clinicaId)
      ]);

      const receitas = agendamentos.map(item => ({
        id: item.id,
        origem: 'agenda',
        descricao: item.tipo || 'Atendimento',
        pessoa: item.pacienteNome || 'Paciente',
        valor: parseFloat(item.valor) || 0,
        tipo: 'receita',
        data: item.start ? new Date(item.start).toISOString().split('T')[0] : 'N/A',
        hora: item.start ? new Date(item.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        status: item.status,
        categoria: 'Consultas',
        dataCompleta: item.start ? new Date(item.start) : new Date()
      }));

      const despesas = listaDespesas.map(item => ({
        id: item.id,
        origem: 'despesa',
        descricao: item.descricao || 'Despesa',
        pessoa: item.fornecedor || '-',
        valor: parseFloat(item.valor) || 0,
        tipo: 'despesa',
        data: item.data,
        hora: item.hora,
        status: 'pago',
        categoria: item.categoria || 'Outros',
        dataCompleta: new Date(item.data + 'T12:00:00')
      }));

      const tudo = [...receitas, ...despesas];
      tudo.sort((a, b) => b.dataCompleta - a.dataCompleta);

      setTransacoes(tudo);
    } catch (error) {
      console.error("Erro financeiro:", error);
      showToast({ message: "Erro ao carregar dados financeiros.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [clinicaId, showToast]);

  useEffect(() => { 
    carregarDados(); 
  }, [carregarDados]);

  const handleSalvarDespesa = async (dados) => {
    try {
      await financeiroService.adicionar({
        ...dados,
        userId: clinicaId
      });
      showToast({ message: "Despesa lançada com sucesso!", type: "success" });
      carregarDados();
      setModalOpen(false);
    } catch (error) {
      showToast({ message: "Erro ao salvar despesa.", type: "error" });
    }
  };

  const handleExcluir = async (item) => {
    if (item.origem === 'agenda') {
      showToast({ message: "Para excluir receitas, vá na Agenda.", type: "warning" });
      return;
    }
    if (window.confirm("Tem certeza que deseja excluir esta despesa?")) {
      try {
        await financeiroService.excluir(item.id, clinicaId);
        showToast({ message: "Despesa excluída!", type: "success" });
        setTransacoes(prev => prev.filter(t => t.id !== item.id));
      } catch (error) {
        showToast({ message: "Erro ao excluir despesa.", type: "error" });
      }
    }
  };

  // Filtros e cálculos
  const transacoesFiltradas = transacoes.filter(t => {
    const matchesSearch = 
      (t.descricao || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
      (t.pessoa || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
      (t.categoria || '').toLowerCase().includes(termoBusca.toLowerCase());
    
    const matchesType = filterType === 'all' || t.tipo === filterType;
    
    return matchesSearch && matchesType;
  });

  const totalReceitas = transacoes.reduce((acc, curr) => curr.tipo === 'receita' ? acc + curr.valor : acc, 0);
  const totalDespesas = transacoes.reduce((acc, curr) => curr.tipo === 'despesa' ? acc + curr.valor : acc, 0);
  const saldo = totalReceitas - totalDespesas;
  
  const receitasHoje = transacoes
    .filter(t => t.tipo === 'receita' && new Date(t.dataCompleta).toDateString() === new Date().toDateString())
    .reduce((acc, curr) => acc + curr.valor, 0);

  const despesasHoje = transacoes
    .filter(t => t.tipo === 'despesa' && new Date(t.dataCompleta).toDateString() === new Date().toDateString())
    .reduce((acc, curr) => acc + curr.valor, 0);

  const formatMoney = (val) => {
    return val.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  // Dados para gráficos
  const dadosGraficoMensal = Array.from({ length: 12 }, (_, i) => {
    const mes = new Date(new Date().getFullYear(), i, 1);
    const transacoesMes = transacoes.filter(t => 
      new Date(t.dataCompleta).getMonth() === i && 
      new Date(t.dataCompleta).getFullYear() === new Date().getFullYear()
    );
    
    return {
      mes: mes.toLocaleDateString('pt-BR', { month: 'short' }),
      receitas: transacoesMes.filter(t => t.tipo === 'receita').reduce((a, b) => a + b.valor, 0),
      despesas: transacoesMes.filter(t => t.tipo === 'despesa').reduce((a, b) => a + b.valor, 0)
    };
  });

  const dadosCategorias = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, curr) => {
      const categoria = curr.categoria || 'Outros';
      if (!acc[categoria]) acc[categoria] = 0;
      acc[categoria] += curr.valor;
      return acc;
    }, {});

  const pieData = Object.entries(dadosCategorias).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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
          {trend > 0 ? (
            <ArrowUpRight size={16} className="text-emerald-500" />
          ) : trend < 0 ? (
            <ArrowDownRight size={16} className="text-red-500" />
          ) : null}
          <span className={`text-sm font-bold ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-slate-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      </div>
      <p className="text-sm text-slate-500 font-medium mb-2">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-2">{description}</p>
      )}
    </motion.div>
  );

  const TransacaoRow = ({ item }) => (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all bg-white group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            item.tipo === 'receita' 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            {item.tipo === 'receita' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-slate-800">{item.descricao}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                item.origem === 'agenda' 
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {item.origem === 'agenda' ? 'Consulta' : 'Despesa'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(item.data)}
              </span>
              {item.pessoa !== '-' && (
                <span className="flex items-center gap-1">
                  <FileText size={14} />
                  {item.pessoa}
                </span>
              )}
              <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                {item.categoria}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`font-bold text-lg ${
              item.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {item.tipo === 'receita' ? '+' : '-'} {formatMoney(item.valor)}
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock size={12} />
              <span>{item.hora}</span>
            </div>
          </div>
          
          {item.origem === 'despesa' && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={() => handleExcluir(item)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
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
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl shadow-xl shadow-emerald-500/20">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                    Gestão Financeira
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Controle completo de receitas e despesas da <span className="font-semibold text-slate-700">{userData?.nomeClinica || "sua clínica"}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setModalOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Plus size={20} /> Nova Despesa
              </button>
              <button className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
                <Download size={20} /> Exportar
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Receitas Totais"
              value={formatMoney(totalReceitas)}
              icon={TrendingUp}
              color="text-emerald-600"
              trend={12.5}
              description="Mês atual"
            />
            <StatCard 
              title="Despesas Totais"
              value={formatMoney(totalDespesas)}
              icon={TrendingDown}
              color="text-red-600"
              trend={-3.2}
              description="Mês atual"
            />
            <StatCard 
              title="Saldo Líquido"
              value={formatMoney(saldo)}
              icon={DollarSign}
              color={saldo >= 0 ? "text-emerald-600" : "text-red-600"}
              trend={saldo >= 0 ? 8.7 : -5.3}
              description="Resultado atual"
            />
            <StatCard 
              title="Receitas Hoje"
              value={formatMoney(receitasHoje)}
              icon={Wallet}
              color="text-blue-600"
              trend={24}
              description="Dia atual"
            />
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por descrição, pessoa ou categoria..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:bg-white transition-all text-slate-700"
                />
              </div>
              
              <div className="flex gap-3">
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  {['all', 'receita', 'despesa'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        filterType === type
                          ? type === 'receita' 
                            ? 'bg-emerald-600 text-white' 
                            : type === 'despesa'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-800 text-white'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {type === 'all' && 'Todos'}
                      {type === 'receita' && 'Receitas'}
                      {type === 'despesa' && 'Despesas'}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={() => setViewType(viewType === 'list' ? 'chart' : 'list')}
                  className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                >
                  {viewType === 'list' ? <BarChart3 size={20} /> : <FileText size={20} />}
                </button>
                
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                >
                  {showDetails ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
            </div>
            
            {/* Período */}
            <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
              {['day', 'week', 'month', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {period === 'day' && 'Hoje'}
                  {period === 'week' && 'Esta Semana'}
                  {period === 'month' && 'Este Mês'}
                  {period === 'year' && 'Este Ano'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gráficos ou Lista */}
        {viewType === 'chart' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Gráfico de Linha */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-600" />
                Evolução Mensal
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGraficoMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f6" />
                    <XAxis 
                      dataKey="mes" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={(val) => `R$ ${val/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value) => [formatMoney(value), '']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="receitas" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="despesas" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Pizza */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                <PieChart size={20} className="text-blue-600" />
                Despesas por Categoria
              </h3>
              <div className="h-80 flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatMoney(value), 'Total']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-slate-400">
                    <PieChart size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Sem dados de despesas para análise</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Lista de Transações */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-slate-600" />
                Últimas Transações
              </h3>
              <span className="text-sm text-slate-500">
                {transacoesFiltradas.length} transações encontradas
              </span>
            </div>
          </div>
          
          <div className="p-6 space-y-3 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 bg-slate-50 animate-pulse rounded-xl">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : transacoesFiltradas.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-emerald-50 rounded-full flex items-center justify-center">
                  <DollarSign size={40} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhuma transação encontrada</h3>
                <p className="text-slate-500 mb-6">
                  {termoBusca ? 'Tente ajustar sua busca.' : 'Comece registrando suas transações.'}
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2"
                >
                  <Plus size={20} /> Registrar Primeira Despesa
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {transacoesFiltradas.map((item) => (
                  <TransacaoRow key={item.id + item.origem} item={item} />
                ))}
              </AnimatePresence>
            )}
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-600">
                <span className="font-bold">{transacoesFiltradas.length}</span> transações • 
                <span className="text-emerald-600 font-bold mx-2">+{formatMoney(totalReceitas)}</span> • 
                <span className="text-red-600 font-bold mx-2">-{formatMoney(totalDespesas)}</span>
              </div>
              <button 
                onClick={carregarDados}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
              >
                <RefreshCw size={16} /> Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <ModalDespesa 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={handleSalvarDespesa}
      />
    </div>
  );
}