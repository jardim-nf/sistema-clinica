// src/pages/Financeiro.jsx - CORRIGIDO: showToast e Uso de userData/clinicaId

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { agendaService } from '../services/agendaService';
import { financeiroService } from '../services/financeiroService';
import ModalDespesa from '../components/ModalDespesa';

import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, Clock, Filter, Plus, Search, FileText, Loader2, Trash2
} from 'lucide-react';

export default function Financeiro() {
  const { userData } = useAuth(); // Usar userData
  const { showToast } = useToast(); // CORREÇÃO: Usando showToast
  
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const clinicaId = userData?.clinicaId; // ID que deve ser usado no Firestore

  // --- CARREGAR TUDO (Agenda + Despesas) ---
  const carregarDados = useCallback(async () => {
    if (!clinicaId) return;
    setLoading(true);
    try {
        // 1. Busca Receitas (Agenda) - Usando clinicaId (o userId)
        const agendamentos = await agendaService.listar(clinicaId); 
        const receitas = agendamentos.map(item => ({
            id: item.id,
            origem: 'agenda',
            descricao: item.tipo || 'Atendimento',
            pessoa: item.pacienteNome || 'Consumidor',
            valor: parseFloat(item.valor) || 0,
            tipo: 'receita',
            data: item.start ? new Date(item.start).toISOString().split('T')[0] : 'N/A',
            hora: item.start ? new Date(item.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            status: item.status
        }));

        // 2. Busca Despesas (Novo Serviço) - Usando clinicaId
const listaDespesas = await financeiroService.listarDespesas(clinicaId);
        const despesas = listaDespesas.map(item => ({
            id: item.id,
            origem: 'despesa',
            descricao: item.descricao || 'Despesa sem nome',
            pessoa: '-', 
            valor: parseFloat(item.valor) || 0,
            tipo: 'despesa',
            data: item.data,
            hora: item.hora,
            status: 'pago'
        }));

        const tudo = [...receitas, ...despesas];
        tudo.sort((a, b) => new Date(b.data) - new Date(a.data));

        setTransacoes(tudo);
    } catch (error) {
        console.error("Erro financeiro:", error);
        showToast({ message: "Erro ao carregar dados financeiros.", type: "error" }); // CORREÇÃO
    } finally {
        setLoading(false);
    }
  }, [clinicaId, showToast]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // --- SALVAR DESPESA ---
  const handleSalvarDespesa = async (dados) => {
    try {
        await financeiroService.adicionar({
            ...dados,
            userId: clinicaId // CORREÇÃO: Usando clinicaId
        });
        showToast({ message: "Despesa lançada!", type: "success" }); // CORREÇÃO
        carregarDados();
    } catch (error) {
        showToast({ message: "Erro ao salvar.", type: "error" }); // CORREÇÃO
    }
  };

  // --- EXCLUIR ---
  const handleExcluir = async (item) => {
      if (item.origem === 'agenda') {
          alert("Para excluir receitas de atendimento, vá na Agenda.");
          return;
      }
      if (window.confirm("Apagar esta despesa?")) {
          await financeiroService.excluir(item.id, clinicaId); // Incluir clinicaId para regras de segurança
          showToast({ message: "Apagado!", type: "success" }); // CORREÇÃO
          setTransacoes(prev => prev.filter(t => t.id !== item.id));
      }
  };

  // --- FILTRO ---
  const transacoesFiltradas = transacoes.filter(t => 
    (t.descricao || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
    (t.pessoa || '').toLowerCase().includes(termoBusca.toLowerCase())
  );

  const totalReceitas = transacoes.reduce((acc, curr) => curr.tipo === 'receita' ? acc + curr.valor : acc, 0);
  const totalDespesas = transacoes.reduce((acc, curr) => curr.tipo === 'despesa' ? acc + curr.valor : acc, 0);
  const saldo = totalReceitas - totalDespesas;
  const formatMoney = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 p-4 md:p-6 flex flex-col items-center">
      
      <div className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-emerald-600"/> Financeiro
          </h1>
          <p className="text-slate-500 text-sm">Controle de caixa (Agenda + Despesas)</p>
        </div>
        
        <button 
            onClick={() => setModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-200 transition active:scale-95 w-full md:w-auto justify-center"
        >
          <Plus size={20}/> Lançar Despesa
        </button>
      </div>

      {/* --- CARDS DE RESUMO (RESPONSIVO) --- */}
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
             <div><p className="text-xs font-bold text-slate-400 uppercase">Receitas</p><h3 className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{formatMoney(totalReceitas)}</h3></div>
             <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><TrendingUp size={24}/></div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
             <div><p className="text-xs font-bold text-slate-400 uppercase">Despesas</p><h3 className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{formatMoney(totalDespesas)}</h3></div>
             <div className="p-3 bg-red-100 text-red-600 rounded-xl"><TrendingDown size={24}/></div>
         </div>
         <div className="bg-slate-900 p-6 rounded-2xl shadow-lg flex justify-between items-center">
             <div><p className="text-xs font-bold text-slate-400 uppercase">Saldo Líquido</p><h3 className={`text-xl sm:text-2xl font-bold mt-1 ${saldo >= 0 ? 'text-white' : 'text-red-400'}`}>{formatMoney(saldo)}</h3></div>
             <div className="p-3 bg-slate-800 text-white rounded-xl"><DollarSign size={24}/></div>
         </div>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-2">
             <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg w-full sm:max-w-xs focus-within:border-emerald-500 transition">
                 <Search size={18} className="text-slate-400"/>
                 <input type="text" placeholder="Buscar descrição ou pessoa..." className="bg-transparent outline-none text-sm w-full" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}/>
             </div>
             <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-500"><Filter size={18}/></button>
         </div>

         <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
             {loading ? <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Carregando...</div> : 
              transacoesFiltradas.length === 0 ? <div className="p-10 text-center text-slate-400">Nenhum lançamento.</div> : 
              transacoesFiltradas.map((item) => (
                 <div key={item.id + item.origem} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between group transition">
                     <div className="flex items-center gap-4 w-full sm:w-auto">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.tipo === 'receita' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                             {item.tipo === 'receita' ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                         </div>
                         <div>
                             <h4 className="font-bold text-slate-800">{item.descricao}</h4>
                             <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                 <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                 {item.pessoa !== '-' && <span className="flex items-center gap-1"><FileText size={12}/> {item.pessoa}</span>}
                             </div>
                         </div>
                     </div>
                     <div className="text-left sm:text-right flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                         <div>
                            <p className={`font-bold text-lg ${item.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {item.tipo === 'receita' ? '+' : '-'} {formatMoney(item.valor)}
                            </p>
                            <span className="text-[10px] uppercase font-bold text-slate-400">{item.origem}</span>
                         </div>
                         {item.origem === 'despesa' && (
                             <button onClick={() => handleExcluir(item)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                                <Trash2 size={16}/>
                             </button>
                         )}
                     </div>
                 </div>
             ))}
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