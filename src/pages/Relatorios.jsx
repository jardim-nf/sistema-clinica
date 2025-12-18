import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FileText, Download, Share2, TrendingUp, DollarSign, Calendar, Clock, User } from 'lucide-react';
import { jsPDF } from "jspdf";

export default function Relatorios() {
  const { user, userData } = useAuth();
  const [transacoes, setTransacoes] = useState([]);
  const [resumo, setResumo] = useState({ total: 0, ticketMedio: 0, qtd: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      if (!user) return;
      try {
        const q = query(collection(db, "agendamentos"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        
        let total = 0;
        const lista = snapshot.docs.map(doc => {
            const data = doc.data();
            const valorFloat = parseFloat((data.valor || "0").replace(/\./g, '').replace(',', '.')) || 0;
            total += valorFloat;
            
            return {
                id: doc.id,
                ...data,
                valorFloat // Guardamos o float para ordenar ou somar se precisar
            };
        });

        // Ordenar por data (mais recente primeiro)
        lista.sort((a, b) => new Date(b.data) - new Date(a.data));

        setTransacoes(lista);
        setResumo({
            total,
            qtd: lista.length,
            ticketMedio: lista.length > 0 ? total / lista.length : 0
        });

      } catch (error) {
        console.error("Erro ao carregar relatório:", error);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [user]);

  const formatarMoeda = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- GERAR PDF FINANCEIRO ---
  const baixarPDF = () => {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text("Relatório Financeiro", 105, 20, null, null, "center");
      doc.setFontSize(12);
      doc.text(userData?.nomeClinica || "ClinicaSys", 105, 28, null, null, "center");
      
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, 20, 40);
      doc.text(`Total Faturado: ${formatarMoeda(resumo.total)}`, 20, 50);
      doc.text(`Consultas Realizadas: ${resumo.qtd}`, 20, 60);

      doc.line(20, 65, 190, 65);

      let y = 75;
      doc.setFontSize(10);
      doc.text("DATA", 20, y);
      doc.text("PACIENTE", 50, y);
      doc.text("VALOR", 160, y);
      
      y += 5;
      doc.line(20, y, 190, y);
      y += 10;

      transacoes.forEach(t => {
          if (y > 270) { doc.addPage(); y = 20; } // Nova página se encher
          doc.text(new Date(t.data).toLocaleDateString(), 20, y);
          doc.text(t.paciente.substring(0, 30), 50, y);
          doc.text(`R$ ${t.valor}`, 160, y);
          y += 10;
      });

      doc.save("Relatorio_Financeiro.pdf");
  };

  // --- ENVIAR RESUMO WHATSAPP ---
  const enviarZap = () => {
      const msg = `*Relatório Financeiro - ${userData?.nomeClinica || 'Minha Clínica'}*\n\n` +
                  `💰 *Faturamento Total:* ${formatarMoeda(resumo.total)}\n` +
                  `📊 *Consultas:* ${resumo.qtd}\n` +
                  `📈 *Ticket Médio:* ${formatarMoeda(resumo.ticketMedio)}\n\n` +
                  `Gerado em: ${new Date().toLocaleDateString()}`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      
      {/* --- CABEÇALHO --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Relatórios & Financeiro</h1>
            <p className="text-slate-500 text-sm">Acompanhe o desempenho da sua clínica</p>
        </div>
        
        {/* Botões Responsivos (Full width no mobile) */}
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button 
                onClick={baixarPDF} 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-3 rounded-lg hover:bg-slate-900 transition font-bold text-sm shadow-lg"
            >
                <Download size={18}/> Baixar PDF
            </button>
            <button 
                onClick={enviarZap} 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-bold text-sm shadow-lg"
            >
                <Share2 size={18}/> Enviar WhatsApp
            </button>
        </div>
      </div>

      {/* --- CARDS DE RESUMO --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between md:block">
            <div className="flex items-center gap-3 md:mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><TrendingUp size={20}/></div>
                <p className="text-sm font-bold text-slate-500 hidden md:block">Faturamento Total</p>
                <p className="text-sm font-bold text-slate-500 md:hidden">Faturamento</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{formatarMoeda(resumo.total)}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between md:block">
            <div className="flex items-center gap-3 md:mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Calendar size={20}/></div>
                <p className="text-sm font-bold text-slate-500">Consultas</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{resumo.qtd}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between md:block">
            <div className="flex items-center gap-3 md:mb-2">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><DollarSign size={20}/></div>
                <p className="text-sm font-bold text-slate-500">Ticket Médio</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{formatarMoeda(resumo.ticketMedio)}</h3>
        </div>
      </div>

      {/* --- LISTA DE TRANSAÇÕES --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 font-bold text-slate-700 flex items-center gap-2">
            <FileText size={18}/> Extrato de Consultas
        </div>
        
        {loading ? (
            <p className="p-8 text-center text-slate-400">Calculando finanças...</p>
        ) : transacoes.length === 0 ? (
            <p className="p-8 text-center text-slate-400">Nenhuma movimentação encontrada.</p>
        ) : (
            <>
                {/* 1. VISÃO DESKTOP (TABELA) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Paciente</th>
                                <th className="p-4">Serviço</th>
                                <th className="p-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transacoes.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-slate-600">
                                        {new Date(t.data).toLocaleDateString()} <span className="text-xs text-slate-400 ml-1">{t.hora}</span>
                                    </td>
                                    <td className="p-4 font-medium text-slate-800">{t.paciente}</td>
                                    <td className="p-4 text-slate-600">Consulta</td>
                                    <td className="p-4 text-right font-bold text-green-600">R$ {t.valor}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 2. VISÃO MOBILE (CARDS) */}
                <div className="md:hidden divide-y divide-slate-100">
                    {transacoes.map((t) => (
                        <div key={t.id} className="p-4 flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-slate-800 flex items-center gap-2">
                                    <User size={14} className="text-slate-400"/> {t.paciente}
                                </span>
                                <div className="flex gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(t.data).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Clock size={12}/> {t.hora}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-green-600">R$ {t.valor}</span>
                                <span className="text-xs text-slate-400">Consulta</span>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}
      </div>
    </div>
  );
}