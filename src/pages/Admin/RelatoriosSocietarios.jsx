// src/pages/Admin/RelatoriosSocietarios.jsx - RELATÓRIOS E ANÁLISES SOCIETÁRIAS (COM GRÁFICOS REAIS)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FileText, Filter, DollarSign, BarChart3, TrendingUp, RefreshCw, CheckCircle, Percent, Users, Clock, Loader2
} from 'lucide-react';
// IMPORTANDO COMPONENTES DE GRÁFICO
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, 
} from 'recharts';

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { 
    getClinicas, 
    getRelatorioSocietarioData // Importando a nova função de dados para gráficos
} from '../../services/masterService'; 


// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatShortCurrency = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
};
// ----------------------------

// --- Componente de Gráfico de Linha (Faturamento) ---
const RevenueLineChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="mes" stroke="#6b7280" />
            <YAxis 
                stroke="#6b7280" 
                tickFormatter={formatShortCurrency}
                domain={[dataMin => Math.floor(dataMin * 0.95 / 1000) * 1000, 'auto']}
            />
            <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `Mês: ${label}`}
                contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    border: '1px solid #ccc', 
                    borderRadius: '8px',
                    padding: '10px'
                }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            
            <Line 
                type="monotone" 
                dataKey="faturamentoEstimado" 
                stroke="#4f46e5" 
                strokeWidth={2}
                name="Estimado (Contratual)" 
                dot={false}
            />
            <Line 
                type="monotone" 
                dataKey="faturamentoReal" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Real (Recebido)" 
                dot={false}
            />
        </LineChart>
    </ResponsiveContainer>
);

// --- Componente de Gráfico de Pizza (Status de Clínicas) ---
const StatusPieChart = ({ data }) => {
    // Calcula o total para calcular a porcentagem no Tooltip
    const total = data.reduce((sum, entry) => sum + entry.value, 0);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip 
                    formatter={(value, name, props) => [`${value} Clínicas`, props.payload.name]}
                    contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        border: '1px solid #ccc', 
                        borderRadius: '8px',
                        padding: '10px'
                    }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
            </PieChart>
        </ResponsiveContainer>
    );
};


export default function RelatoriosSocietarios() {
    const { userData } = useAuth();
    const { showToast } = useToast();
    
    const [loading, setLoading] = useState(false);
    const [clinicas, setClinicas] = useState([]); 
    const [relatorioData, setRelatorioData] = useState({
        ticketMedio: 2850.50,          
        taxaOcupacaoMedia: 78,         
        receitaEstimada: 65000,         
        novosCadastros: 8,              
    });
    // NOVO ESTADO: Dados reais para os gráficos
    const [chartData, setChartData] = useState({
        faturamentoHistorico: [],
        statusAtual: [],
    });

    const [filtros, setFiltros] = useState({
        mesAno: new Date().toISOString().substring(0, 7),
        clinicaId: 'todos',
    });


    // --- Funções de Serviço ---

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [clinicasData, chartResult] = await Promise.all([
                getClinicas(),
                getRelatorioSocietarioData() // Chama para obter dados dos gráficos
            ]);
            setClinicas(clinicasData);
            setChartData(chartResult);
        } catch (error) {
            console.error("Erro ao carregar dados para o relatório:", error);
            showToast('Erro ao carregar dados mestres.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if(userData?.role === 'super_admin') fetchData();
    }, [fetchData, userData]);


    // Função que "executaria" o relatório com base nos filtros
    const handleGerarRelatorio = (e) => {
        e.preventDefault();
        setLoading(true);
        
        // Simula o tempo de processamento e gera dados ligeiramente variados
        setTimeout(() => {
            const baseRevenue = 60000;
            const baseNew = 7;
            
            setRelatorioData({
                ticketMedio: 2750 + Math.floor(Math.random() * 200),
                taxaOcupacaoMedia: 75 + Math.floor(Math.random() * 8), 
                receitaEstimada: baseRevenue + Math.floor(Math.random() * 15000),
                novosCadastros: baseNew + Math.floor(Math.random() * 5),
            });
            // Recarrega os dados do gráfico (simulado)
            fetchData();
            
            setLoading(false);
            showToast('Relatório gerado com sucesso!', 'success');
        }, 1000);
    };

    if (userData?.role !== 'super_admin') {
        return <div className="text-red-500">Acesso negado.</div>;
    }

    // --- Componente de Card de Métrica ---
    const MetricCard = ({ title, value, icon: Icon, colorClass }) => (
        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-b-2" style={{ borderColor: colorClass }}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">
                        {title.includes('Receita') || title.includes('Ticket') 
                            ? formatCurrency(value) 
                            : title.includes('Ocupação')
                            ? `${value.toFixed(0)}%`
                            : value.toLocaleString('pt-BR')}
                    </p>
                </div>
                <Icon size={30} className={`opacity-50 ${colorClass}`} />
            </div>
        </div>
    );
    // ---------------------------------------------


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <FileText size={32} className="text-indigo-600" />
                <h1 className="text-3xl font-bold text-slate-800">Relatórios Societários</h1>
            </div>

            <p className="text-slate-600 border-l-4 border-indigo-400 pl-4 py-1 bg-indigo-50/50 p-2 rounded-md">
                Análises de performance, métricas de crescimento e resultados financeiros consolidados.
            </p>

            {/* --- Seção de Filtros (Mantida) --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Filter size={20} className="text-indigo-600" /> Parâmetros do Relatório
                </h2>
                <form onSubmit={handleGerarRelatorio} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    
                    {/* Filtro de Período/Mês */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Período de Referência</label>
                        <input
                            type="month"
                            value={filtros.mesAno}
                            onChange={(e) => setFiltros({ ...filtros, mesAno: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            required
                        />
                    </div>

                    {/* Filtro de Clínica */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Clínica Específica (Opcional)</label>
                        <select
                            value={filtros.clinicaId}
                            onChange={(e) => setFiltros({ ...filtros, clinicaId: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg"
                        >
                            <option value="todos">Todas as Clínicas</option>
                            {clinicas.map(c => (
                                <option key={c.uid} value={c.uid}>
                                    {c.nomeFantasia || c.uid}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-400"
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        {loading ? 'Gerando...' : 'Gerar Relatório'}
                    </button>
                </form>
            </div>

            {/* --- Resultados Chave (Métricas) --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard 
                    title="Receita Estimada (Total)" 
                    value={relatorioData.receitaEstimada} 
                    icon={DollarSign} 
                    colorClass="text-green-500"
                />
                <MetricCard 
                    title="Ticket Médio Mensalidade" 
                    value={relatorioData.ticketMedio} 
                    icon={TrendingUp} 
                    colorClass="text-blue-500"
                />
                <MetricCard 
                    title="Taxa de Ocupação Média" 
                    value={relatorioData.taxaOcupacaoMedia} 
                    icon={Percent} 
                    colorClass="text-orange-500"
                />
                 <MetricCard 
                    title="Novos Contratos no Mês" 
                    value={relatorioData.novosCadastros} 
                    icon={CheckCircle} 
                    colorClass="text-indigo-500"
                />
            </div>

            {/* --- Visualização Detalhada (GRÁFICOS REAIS) --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
                 <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                    <BarChart3 size={20} className="text-indigo-600" /> Histórico de Faturamento (12 Meses)
                </h2>
                <div className="h-96 w-full">
                    {chartData.faturamentoHistorico.length > 0 ? (
                        <RevenueLineChart data={chartData.faturamentoHistorico} />
                    ) : (
                        <div className="text-center py-10 text-slate-400">Carregando dados de faturamento...</div>
                    )}
                </div>
                
                <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2 border-t pt-8">
                    <Users size={20} className="text-indigo-600" /> Distribuição Atual de Clínicas
                </h2>
                <div className="h-96 w-full flex justify-center">
                    {chartData.statusAtual.length > 0 ? (
                        <StatusPieChart data={chartData.statusAtual} />
                    ) : (
                        <div className="text-center py-10 text-slate-400">Carregando dados de distribuição...</div>
                    )}
                </div>
            </div>

        </div>
    );
}