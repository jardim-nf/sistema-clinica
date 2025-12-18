// src/components/ModalHistoricoFinanceiro.jsx - CORRIGIDO: Sintaxe e Otimização com useMemo

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Adicionado useMemo
import { 
    X, Upload, Trash2, Loader2, DollarSign, Calendar, FileText, Plus 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
    getClinicaHistory, registerMonthlyPayment, uploadComprovante, deleteComprovante
} from '../services/masterService';

import ConfirmModal from './ConfirmModal'; 

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const DATA_INICIO_SISTEMA = new Date(2025, 11, 1); 

const getCurrentMonthRef = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`; // Formato YYYYMM
};

const generateMonths = () => {
    const months = [];
    
    const maxDate = new Date(2027, 0, 1); 
    
    let currentDate = new Date(DATA_INICIO_SISTEMA); 
    
    while (true) {
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        if (currentYear > maxDate.getFullYear() ||
            (currentYear === maxDate.getFullYear() && currentMonth >= maxDate.getMonth())) {
            break;
        }

        const mes = currentDate.getMonth();
        const ano = currentDate.getFullYear();
        
        const referenciaMesAno = `${ano}${String(mes + 1).padStart(2, '0')}`;

        months.push({
            referenciaMesAno: referenciaMesAno, 
            mesDisplay: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate),
        });
        
        currentDate.setMonth(currentDate.getMonth() + 1);
        
        if (months.length > 240) break;
    }
    
    return months.reverse(); 
};
// ----------------------------------------------------------------------


const ModalWrapper = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/70 z-[9998] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all">
            <button onClick={onClose} className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600">
                <X size={24} />
            </button>
            <div className="p-6">
                 {children}
            </div>
        </div>
    </div>
);


export default function ModalHistoricoFinanceiro({ clinica, onClose, fetchSummaryAndList }) {
    const { userData } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [uploading, setUploading] = useState(false);
    
    const [confirmation, setConfirmation] = useState(null);
    
    const [isRegistering, setIsRegistering] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const [newPayment, setNewPayment] = useState({
        valorPago: clinica.valorMensalidade || 2500, 
        mesReferencia: getCurrentMonthRef(),
        dataPagamento: new Date().toISOString().split('T')[0], 
        comprovanteFile: null,
    });


    const showConfirmation = useCallback((title, message, onConfirm, confirmText = 'Confirmar', type = 'warning') => {
        setConfirmation({ title, message, onConfirm, confirmText, type });
    }, []);

    const closeConfirmation = () => setConfirmation(null);


    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getClinicaHistory(clinica.uid);
            setHistory(result); 
        } catch (error) {
            console.error(error);
            showToast({message:'Falha ao carregar histórico mensal.', type: 'error'});
        } finally {
            setLoading(false);
        }
    }, [clinica.uid, showToast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // CORREÇÃO DE SINTAXE E OTIMIZAÇÃO: Usando useMemo
    const combinedHistory = useMemo(() => {
        const allMonths = generateMonths(); 
        
        const historyMap = history.reduce((acc, entry) => {
            acc[entry.referenciaMesAno] = entry;
            return acc;
        }, {});
        
        return allMonths.map(month => {
            const historyEntry = historyMap[month.referenciaMesAno];
            
            const ano = parseInt(month.referenciaMesAno.substring(0, 4));
            const mes = parseInt(month.referenciaMesAno.substring(4, 6)) - 1;
            
            const dataVencimento = new Date(ano, mes, 10); 

            return {
                ...month,
                valorMensalidade: clinica.valorMensalidade || 2500,
                status: historyEntry?.status || 'PENDENTE',
                comprovanteUrl: historyEntry?.comprovanteUrl || null,
                comprovanteNome: historyEntry?.comprovanteNome || null,
                dataVencimento: dataVencimento,
                valorPago: historyEntry?.valorPago || 0,
                dataRegistro: historyEntry?.dataRegistro 
                                ? (historyEntry.dataRegistro.toDate 
                                    ? new Date(historyEntry.dataRegistro.toDate()).toLocaleDateString('pt-BR') 
                                    : new Date(historyEntry.dataRegistro).toLocaleDateString('pt-BR'))
                                : 'N/A',
            };
        });
    }, [history, clinica.valorMensalidade]);


    // --- FUNÇÃO DE REGISTRO DE PAGAMENTO (O "PAGAR" COMPLETO) ---
    const handleRegisterPayment = async (e) => {
        e.preventDefault();
        setIsProcessingPayment(true);

        // A linha 165 (na versão anterior) era esta:
        const mesRef = newPayment.mesReferencia; 
        
        // 1. VALIDAÇÃO ROBUSTA DE VALOR NUMÉRICO
        const sanitizedValue = String(newPayment.valorPago).replace('.', '').replace(',', '.'); 
        const valorNumerico = parseFloat(sanitizedValue);
        
        if (isNaN(valorNumerico) || valorNumerico <= 0) {
            showToast({message:'Valor de pagamento inválido. Use apenas números, e o valor deve ser positivo.', type:'error'});
            setIsProcessingPayment(false);
            return;
        }

        // 2. VALIDAÇÃO ROBUSTA DE FORMATO DE REFERÊNCIA
        if (!/^\d{6}$/.test(mesRef)) {
            showToast({message:'A referência do mês deve ser no formato YYYYMM (6 dígitos).', type:'error'});
            setIsProcessingPayment(false);
            return;
        }

        let comprovanteUrl = null;
        let comprovanteNome = null;

        // 3. Upload do Comprovante (Se houver arquivo)
        if (newPayment.comprovanteFile) {
            showToast({message:'Fazendo upload do comprovante...', type:'info'});
            try {
                const uploadResult = await uploadComprovante(
                    newPayment.comprovanteFile, 
                    clinica.uid, 
                    mesRef
                );
                comprovanteUrl = uploadResult.url;
                comprovanteNome = uploadResult.fileName;
            } catch (error) {
                showToast({message:'Erro ao fazer upload do comprovante.', type:'error'});
                setIsProcessingPayment(false);
                return;
            }
        }
        
        // 4. Registro no Firestore
        const paymentData = {
            valorPago: valorNumerico,
            status: 'PAGO',
            dataPagamento: new Date(newPayment.dataPagamento), // Salva como Date
            comprovanteUrl,
            comprovanteNome,
        };

        try {
            await registerMonthlyPayment(clinica.uid, mesRef, paymentData); 
            showToast({message:'Pagamento registrado com sucesso!', type:'success'});
            
            // 5. CRÍTICO: CHAMA fetchHistory NOVAMENTE PARA ATUALIZAR A LISTA
            await fetchHistory();     
            fetchSummaryAndList();     
            
            setIsRegistering(false);
            setNewPayment({
                ...newPayment,
                comprovanteFile: null,
            });
        } catch (error) {
            console.error("Erro ao registrar pagamento:", error);
            showToast({message:'Falha ao registrar pagamento. Verifique o console para mais detalhes.', type:'error'});
        } finally {
            setIsProcessingPayment(false);
        }
    };
    // -------------------------------------------------------------


    // 2. Executa a lógica de atualização (usada para o botão de Reverter/Marcar Rápido)
    const processUpdateStatus = async (mesRef, isPaid, currentEntry) => {
        try {
            await registerMonthlyPayment(clinica.uid, mesRef, {
                status: isPaid ? 'PAGO' : 'PENDENTE',
                valorPago: isPaid ? (currentEntry.valorMensalidade || 2500) : 0, 
                dataPagamento: isPaid ? new Date() : null,
                comprovanteUrl: isPaid ? currentEntry.comprovanteUrl : null, 
                comprovanteNome: isPaid ? currentEntry.comprovanteNome : null,
            });

            showToast({message:`Status de ${currentEntry.mesDisplay} atualizado para ${isPaid ? 'PAGO' : 'PENDENTE'}!`, type:'success'});
            // CRÍTICO: CHAMA fetchHistory NOVAMENTE
            await fetchHistory();
            await fetchSummaryAndList(); 

        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            showToast({message:'Falha ao atualizar status mensal.', type:'error'});
        }
    };
    
    // 1. Inicia a confirmação do pagamento/reversão (usada nos botões da tabela)
    const handleUpdateStatus = useCallback((mesRef, isPaid) => {
        if (!userData.uid) return;
        
        const currentEntry = combinedHistory.find(m => m.referenciaMesAno === mesRef); // Usando combinedHistory
        if (!currentEntry) return;

        const action = isPaid ? 'registro de pagamento' : 'reversão';
        const title = isPaid ? 'Confirmar Pagamento' : 'Reverter Status';
        const message = `Você realmente deseja ${action} para **${currentEntry.mesDisplay}**? (Isso usará o valor contratual padrão se não houver registro manual)`;

        showConfirmation(
            title, 
            message, 
            () => {
                closeConfirmation();
                processUpdateStatus(mesRef, isPaid, currentEntry);
            },
            isPaid ? 'Marcar Pago' : 'Reverter',
            isPaid ? 'success' : 'warning'
        );
    }, [userData.uid, showToast, fetchSummaryAndList, fetchHistory, showConfirmation, clinica.valorMensalidade, combinedHistory]);


    // --- AÇÕES DE UPLOAD DE COMPROVANTE ---

    const handleUploadFile = async (e, mesRef) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const { url, fileName } = await uploadComprovante(file, clinica.uid, mesRef);
            
            await registerMonthlyPayment(clinica.uid, mesRef, {
                comprovanteUrl: url,
                comprovanteNome: fileName,
            });

            showToast({message:'Comprovante enviado com sucesso!', type:'success'});
            // CRÍTICO: CHAMA fetchHistory NOVAMENTE
            await fetchHistory();

        } catch (error) {
            console.error("Erro ao fazer upload do comprovante:", error);
            showToast({message:'Falha ao fazer upload do comprovante.', type:'error'});
        } finally {
            setUploading(false);
        }
    };

    // 3. Ação de Deleção (Inicia a Confirmação)
    const handleDeleteComprovante = useCallback((mesRef, url) => {
        showConfirmation(
            'Confirmar Remoção',
            'Você tem certeza que deseja **remover permanentemente** este comprovante?',
            () => {
                closeConfirmation();
                processDeleteComprovante(mesRef, url);
            }
        );
    }, [showConfirmation]);

    // Função que executa a lógica de deleção
    const processDeleteComprovante = async (mesRef, url) => {
        try {
            await deleteComprovante(url);

            await registerMonthlyPayment(clinica.uid, mesRef, {
                comprovanteUrl: null,
                comprovanteNome: null,
            });
            
            showToast({message:'Comprovante removido.', type:'info'});
            // CRÍTICO: CHAMA fetchHistory NOVAMENTE
            await fetchHistory();
            
        } catch (error) {
            console.error("Erro ao deletar comprovante:", error);
            showToast({message:'Falha ao remover o comprovante.', type:'error'});
        }
    };


    if (loading) {
        return <ModalWrapper onClose={onClose}>
            <div className="text-center py-20 text-slate-500">
                <Loader2 size={32} className="animate-spin mx-auto mb-4 text-blue-500" />
                Carregando histórico financeiro...
            </div>
        </ModalWrapper>;
    }


    return (
        <ModalWrapper onClose={onClose}>
            <h3 className="text-2xl font-bold mb-1 text-slate-800 flex items-center gap-2">
                <DollarSign size={24} /> Histórico Financeiro
            </h3>
            <p className="text-sm text-slate-600 mb-6">
                Clínica: <span className="font-semibold">{clinica.nomeFantasia}</span> (Contrato: {formatCurrency(clinica.valorMensalidade || 2500)})
            </p>
            
            {/* --- SEÇÃO DO FORMULÁRIO DE PAGAMENTO (O BOTÃO "PAGAR") --- */}
            <div className='mb-6'>
                <button
                    onClick={() => setIsRegistering(p => !p)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    disabled={isProcessingPayment}
                >
                    <Plus size={18} /> {isRegistering ? 'Cancelar Registro' : 'Registrar Pagamento do Mês'}
                </button>

                {isRegistering && (
                    <form onSubmit={handleRegisterPayment} className="mt-4 p-4 border border-indigo-200 rounded-lg bg-indigo-50/50 space-y-3">
                        <h4 className='font-semibold text-indigo-700 flex items-center gap-2'>
                            <DollarSign size={16} /> Dados do Pagamento Manual
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"> 
                            {/* Valor */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600">Valor Pago (R$)</label>
                                <input type="number" step="0.01" required
                                    value={newPayment.valorPago}
                                    onChange={(e) => setNewPayment({...newPayment, valorPago: e.target.value})}
                                    className="w-full p-2 border rounded-lg"
                                />
                            </div>
                            {/* Mês de Referência */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600">Mês Ref. (YYYYMM)</label>
                                <input type="text" required
                                    value={newPayment.mesReferencia}
                                    onChange={(e) => setNewPayment({...newPayment, mesReferencia: e.target.value})}
                                    className="w-full p-2 border rounded-lg"
                                    maxLength={6}
                                />
                            </div>
                            {/* Data de Pagamento */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600">Data de Pagamento</label>
                                <input type="date" required
                                    value={newPayment.dataPagamento}
                                    onChange={(e) => setNewPayment({...newPayment, dataPagamento: e.target.value})}
                                    className="w-full p-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        {/* Comprovante */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Comprovante (Opcional)</label>
                            <input type="file"
                                onChange={(e) => setNewPayment({...newPayment, comprovanteFile: e.target.files[0]})}
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-indigo-700 hover:file:bg-indigo-50"
                            />
                            {newPayment.comprovanteFile && <p className='text-xs text-slate-500 mt-1'>Arquivo selecionado: {newPayment.comprovanteFile.name}</p>}
                        </div>

                        <button 
                            type="submit" 
                            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            disabled={isProcessingPayment}
                        >
                            {isProcessingPayment ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Registro e Marcar Pago'}
                        </button>
                    </form>
                )}
            </div>
            {/* --- FIM SEÇÃO DO FORMULÁRIO DE PAGAMENTO --- */}


            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <h4 className="text-lg font-semibold text-slate-700 mb-3">Histórico Mensal Detalhado</h4>

                {combinedHistory.map(month => (
                    <div 
                        key={month.referenciaMesAno} 
                        className={`p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between border ${
                            month.status === 'PAGO' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                    >
                        
                        {/* 1. MÊS E VENCIMENTO */}
                        <div className="flex items-center gap-3 w-full md:w-1/4 mb-2 md:mb-0">
                            <Calendar size={20} className="text-slate-500" />
                            <div>
                                <p className="font-semibold text-slate-800 capitalize">{month.mesDisplay}</p>
                                <p className="text-xs text-slate-500">Vencimento: {month.dataVencimento.toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>

                        {/* 2. VALOR PAGO */}
                        <div className='text-left w-full md:w-1/4 mb-2 md:mb-0 md:text-right'>
                             <p className="font-bold text-slate-700">{formatCurrency(month.valorPago)}</p>
                             <p className="text-xs text-slate-500 mt-1">Contrato: {formatCurrency(month.valorMensalidade)}</p>
                        </div>

                        {/* 3. AÇÕES (Status, Botão, Comprovante) */}
                        <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-1/2 justify-end">
                            
                            {/* Status */}
                            <div className="text-left md:text-right w-full md:w-1/4">
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                    month.status === 'PAGO' ? 'text-green-800 bg-green-200' : 'text-red-800 bg-red-200'
                                }`}>{month.status}</span>
                                <p className="text-xs text-slate-500 mt-1">{month.dataRegistro}</p>
                            </div>

                            {/* Botão Marcar/Reverter */}
                            <div className="w-full md:w-auto">
                                {month.status === 'PAGO' ? (
                                    <button 
                                        onClick={() => handleUpdateStatus(month.referenciaMesAno, false)}
                                        className="w-full px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                                        title="Reverter para PENDENTE (usará valor zero, apagando data de registro)"
                                    >
                                        Reverter
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleUpdateStatus(month.referenciaMesAno, true)}
                                        className="w-full px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                                        title="Marcar como Pago (usará valor contratual padrão)"
                                    >
                                        Marcar Pago
                                    </button>
                                )}
                            </div>

                            {/* Comprovante */}
                            <div className="w-full md:w-auto flex items-center justify-start md:justify-end">
                                {month.comprovanteUrl ? (
                                    <div className="flex items-center gap-2 text-sm text-blue-600">
                                        <FileText size={18} />
                                        <a 
                                            href={month.comprovanteUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="truncate hover:underline"
                                            title={month.comprovanteNome}
                                        >
                                            Ver Comprovante
                                        </a>
                                        <button 
                                            onClick={() => handleDeleteComprovante(month.referenciaMesAno, month.comprovanteUrl)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                            title="Excluir Comprovante"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className={`relative px-3 py-1 text-xs rounded-lg cursor-pointer transition-colors flex items-center gap-1 ${
                                        uploading ? 'bg-slate-300 text-slate-600' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                    }`}>
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        <span>Anexar</span>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            onChange={(e) => handleUploadFile(e, month.referenciaMesAno)}
                                            disabled={uploading}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* RENDERIZAÇÃO DO MODAL DE CONFIRMAÇÃO */}
            {confirmation && (
                <ConfirmModal 
                    title={confirmation.title}
                    message={confirmation.message}
                    onConfirm={confirmation.onConfirm}
                    onCancel={closeConfirmation}
                    confirmText={confirmation.confirmText}
                    type={confirmation.type}
                />
            )}
        </ModalWrapper>
    );
}