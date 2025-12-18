// src/pages/Admin/DashboardMaster.jsx - DASHBOARD PRINCIPAL DO ADMINISTRADOR GERAL

import React, { useState, useEffect, useCallback } from 'react';
import { 
    BarChart, PieChart, Users, DollarSign, Building, AlertTriangle, CheckCircle, Clock 
} from 'lucide-react';

// Ajuste os caminhos conforme sua estrutura
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { 
    getClinicas, 
    getGlobalFinanceSummary, 
    getGlobalAppointments // Usando a função do Controle Master para contagem
} from '../../services/masterService'; 

// --- FUNÇÕES AUXILIARES ---

const formatCurrency = (value) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Data de corte para o sistema financeiro (Janeiro de 2026)
const DATA_INICIO_SISTEMA = new Date(2026, 0, 1); 


// --- Componente Card de Resumo ---
const SummaryCard = ({ title, value, icon: Icon, colorClass, description }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-b-2" style={{ borderColor: colorClass }}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
            </div>
            <Icon size={36} className={`opacity-50 ${colorClass}`} />
        </div>
        {description && <p className="text-xs text-slate-400 mt-2">{description}</p>}
    </div>
);
// ----------------------------------------------------------------------


export default function DashboardMaster() {
    const { userData } = useAuth();
    const { showToast } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [totalAppointments, setTotalAppointments] = useState(0);

    const fetchDashboardData = useCallback(async () => {
        if (userData?.role !== 'super_admin') return;

        setLoading(true);
        try {
            const [financeSummary, appointments] = await Promise.all([
                getGlobalFinanceSummary(),
                getGlobalAppointments()
            ]);
            
            setSummary(financeSummary);
            setTotalAppointments(appointments.length);

        } catch (error) {
            console.error("Erro ao carregar dados do Dashboard Master:", error);
            showToast('Erro ao carregar dados do painel. Verifique o console.', 'error');
        } finally {
            setLoading(false);
        }
    }, [userData, showToast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (userData?.role !== 'super_admin') {
        return <div className="text-red-500">Acesso negado.</div>;
    }

    if (loading) {
        return <div className="text-center py-20 text-blue-500">Carregando painel de controle Master...</div>;
    }

    // --- Lógica de Aviso de Início do Sistema ---
    const hoje = new Date();
    const sistemaIniciado = hoje >= DATA_INICIO_SISTEMA;

    const financeiroDescription = sistemaIniciado
        ? "Dados referentes ao mês atual (após 01/01/2026)."
        : "O rastreamento financeiro começa em Janeiro/2026. Valores atuais são zero.";


    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Master</h1>
            <p className="text-slate-600 border-l-4 border-slate-400 pl-4 py-1 bg-slate-50/50 p-2 rounded-md">
                Visão geral e KPIs (Indicadores Chave de Desempenho) da plataforma SysClin.
            </p>

            {/* --- Seção de Resumo Financeiro e Operacional --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* 1. Faturamento Mensal */}
                <SummaryCard 
                    title="Faturamento Mensal (Contrato)" 
                    value={formatCurrency(summary.faturamentoMensal)} 
                    icon={DollarSign} 
                    colorClass="text-green-600"
                    description={financeiroDescription}
                />

                {/* 2. Clínicas Ativas */}
                <SummaryCard 
                    title="Clínicas Ativas" 
                    value={summary.totalClinicas} 
                    icon={Building} 
                    colorClass="text-blue-600"
                    description="Total de licenças de clínica ativas."
                />

                {/* 3. Inadimplentes (Financeiro) */}
                <SummaryCard 
                    title="Clínicas Inadimplentes" 
                    value={sistemaIniciado ? summary.clinicasInadimplentes : "0"} 
                    icon={AlertTriangle} 
                    colorClass="text-red-600"
                    description={financeiroDescription}
                />

                {/* 4. Total de Agendamentos (Operacional) */}
                <SummaryCard 
                    title="Agendamentos Registrados" 
                    value={totalAppointments} 
                    icon={Clock} 
                    colorClass="text-indigo-600"
                    description="Total de agendamentos rastreados globalmente."
                />
            </div>
            
            {/* --- Seção de Visualizações (Placeholder) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Gráfico de Status Financeiro */}
                <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                    <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                        <PieChart size={20} className="text-orange-500" /> Status Financeiro (Atual)
                    </h2>
                    <p className="text-sm text-slate-500">Distribuição percentual de adimplência vs. inadimplência.</p>
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                        {/* Aqui entraria um componente de gráfico real (ex: Chart.js ou Recharts) */}
                        <p className="text-slate-400">Placeholder do Gráfico de Pizza</p>
                    </div>
                </div>

                {/* 2. Gráfico de Crescimento de Usuários/Clínicas */}
                <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                    <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                        <BarChart size={20} className="text-blue-500" /> Crescimento de Cadastro
                    </h2>
                    <p className="text-sm text-slate-500">Histórico mensal de novas clínicas cadastradas.</p>
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                        {/* Aqui entraria um componente de gráfico de barras */}
                        <p className="text-slate-400">Placeholder do Gráfico de Barras</p>
                    </div>
                </div>
            </div>

            {/* Aviso para o período de testes (Se for antes de 2026) */}
            {!sistemaIniciado && (
                <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
                    <p className="font-semibold">Aviso:</p>
                    <p className="text-sm">Os dados de "Faturamento" e "Inadimplentes" estão em **modo de simulação zero**. O rastreamento financeiro oficial e a contagem de inadimplência começarão em **Janeiro de 2026**.</p>
                </div>
            )}

        </div>
    );
}