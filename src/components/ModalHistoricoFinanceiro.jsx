// src/components/ModalHistoricoFinanceiro.jsx - Identidade Sanus (Verde)

import React, { useState, useEffect, useCallback, useMemo } from 'react'; 
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
    return `${year}${month}`; 
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

    const handleRegisterPayment = async (e) => {
        e.preventDefault();
        setIsProcessingPayment(true);

        const mesRef = newPayment.mesReferencia; 
        const sanitizedValue = String(newPayment.valorPago).replace('.', '').replace(',', '.'); 
        const valorNumerico = parseFloat(sanitizedValue);
        
        if (isNaN(valorNumerico) || valorNumerico <= 0) {
            showToast({message:'Valor inválido.', type:'error'});
            setIsProcessingPayment(false);
            return;
        }

        if (!/^\d{6}$/.test(mesRef)) {
            showToast({message:'Referência inválida (YYYYMM).', type:'error'});
            setIsProcessingPayment(false);
            return;
        }

        let comprovanteUrl = null;
        let comprovanteNome = null;

        if (newPayment.comprovanteFile) {
            showToast({message:'Enviando comprovante...', type:'info'});
            try {
                const uploadResult = await uploadComprovante(newPayment.comprovanteFile, clinica.uid, mesRef);
                comprovanteUrl = uploadResult.url;
                comprovanteNome = uploadResult.fileName;
            } catch (error) {
                showToast({message:'Erro no upload.', type:'error'});
                setIsProcessingPayment(false);
                return;
            }
        }
        
        const paymentData = {
            valorPago: valorNumerico,
            status: 'PAGO',
            dataPagamento: new Date(newPayment.dataPagamento),
            comprovanteUrl,
            comprovanteNome,
        };

        try {
            await registerMonthlyPayment(clinica.uid, mesRef, paymentData); 
            showToast({message:'Pagamento registrado!', type:'success'});
            await fetchHistory();     
            fetchSummaryAndList();     
            setIsRegistering(false);
            setNewPayment({ ...newPayment, comprovanteFile: null });
        } catch (error) {
            console.error("Erro ao registrar:", error);
            showToast({message:'Falha ao registrar.', type:'error'});
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const processUpdateStatus = async (mesRef, isPaid, currentEntry) => {
        try {
            await registerMonthlyPayment(clinica.uid, mesRef, {
                status: isPaid ? 'PAGO' : 'PENDENTE',
                valorPago: isPaid ? (currentEntry.valorMensalidade || 2500) : 0, 
                dataPagamento: isPaid ? new Date() : null,
                comprovanteUrl: isPaid ? currentEntry.comprovanteUrl : null, 
                comprovanteNome: isPaid ? currentEntry.comprovanteNome : null,
            });

            showToast({message:`Status atualizado!`, type:'success'});
            await fetchHistory();
            await fetchSummaryAndList(); 
        } catch (error) {
            console.error("Erro ao atualizar:", error);
            showToast({message:'Falha na atualização.', type:'error'});
        }
    };
    
    const handleUpdateStatus = useCallback((mesRef, isPaid) => {
        if (!userData.uid) return;
        const currentEntry = combinedHistory.find(m => m.referenciaMesAno === mesRef); 
        if (!currentEntry) return;

        showConfirmation(
            isPaid ? 'Confirmar Pagamento' : 'Reverter Status', 
            `Deseja ${isPaid ? 'registrar pagamento' : 'reverter'} para **${currentEntry.mesDisplay}**?`, 
            () => {
                closeConfirmation();
                processUpdateStatus(mesRef, isPaid, currentEntry);
            },
            isPaid ? 'Marcar Pago' : 'Reverter',
            isPaid ? 'success' : 'warning'
        );
    }, [userData.uid, showToast, fetchSummaryAndList, fetchHistory, showConfirmation, clinica.valorMensalidade, combinedHistory]);

    const handleUploadFile = async (e, mesRef) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const { url, fileName } = await uploadComprovante(file, clinica.uid, mesRef);
            await registerMonthlyPayment(clinica.uid, mesRef, { comprovanteUrl: url, comprovanteNome: fileName });
            showToast({message:'Comprovante enviado!', type:'success'});
            await fetchHistory();
        } catch (error) {
            showToast({message:'Erro no upload.', type:'error'});
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteComprovante = useCallback((mesRef, url) => {
        showConfirmation(
            'Confirmar Remoção',
            'Deseja remover este comprovante?',
            () => {
                closeConfirmation();
                processDeleteComprovante(mesRef, url);
            }
        );
    }, [showConfirmation]);

    const processDeleteComprovante = async (mesRef, url) => {
        try {
            await deleteComprovante(url);
            await registerMonthlyPayment(clinica.uid, mesRef, { comprovanteUrl: null, comprovanteNome: null });
            showToast({message:'Comprovante removido.', type:'info'});
            await fetchHistory();
        } catch (error) {
            showToast({message:'Erro ao remover.', type:'error'});
        }
    };

    if (loading) {
        return <ModalWrapper onClose={onClose}>
            <div className="text-center py-20 text-slate-500">
                <Loader2 size={32} className="animate-spin mx-auto mb-4 text-emerald-500" />
                Carregando histórico...
            </div>
        </ModalWrapper>;
    }

    return (
        <ModalWrapper onClose={onClose}>
            <h3 className="text-2xl font-bold mb-1 text-slate-800 flex items-center gap-2">
                <DollarSign size={24} className="text-emerald-600"/> Histórico Financeiro
            </h3>
            <p className="text-sm text-slate-600 mb-6">
                Clínica: <span className="font-semibold">{clinica.nomeFantasia}</span> (Contrato: {formatCurrency(clinica.valorMensalidade || 2500)})
            </p>
            
            <div className='mb-6'>
                {/* MUDANÇA: Botão verde */}
                <button
                    onClick={() => setIsRegistering(p => !p)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    disabled={isProcessingPayment}
                >
                    <Plus size={18} /> {isRegistering ? 'Cancelar Registro' : 'Registrar Pagamento Manual'}
                </button>

                {isRegistering && (
                    <form onSubmit={handleRegisterPayment} className="mt-4 p-4 border border-emerald-200 rounded-lg bg-emerald-50/50 space-y-3">
                        <h4 className='font-semibold text-emerald-700 flex items-center gap-2'>
                            <DollarSign size={16} /> Dados do Pagamento
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"> 
                            <div>
                                <label className="block text-xs font-medium text-slate-600">Valor Pago (R$)</label>
                                <input type="number" step="0.01" required
                                    value={newPayment.valorPago}
                                    onChange={(e) => setNewPayment({...newPayment, valorPago: e.target.value})}
                                    className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600">Mês Ref. (YYYYMM)</label>
                                <input type="text" required
                                    value={newPayment.mesReferencia}
                                    onChange={(e) => setNewPayment({...newPayment, mesReferencia: e.target.value})}
                                    className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                    maxLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600">Data de Pagamento</label>
                                <input type="date" required
                                    value={newPayment.dataPagamento}
                                    onChange={(e) => setNewPayment({...newPayment, dataPagamento: e.target.value})}
                                    className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600">Comprovante (Opcional)</label>
                            <input type="file"
                                onChange={(e) => setNewPayment({...newPayment, comprovanteFile: e.target.files[0]})}
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-emerald-700 hover:file:bg-emerald-50"
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            disabled={isProcessingPayment}
                        >
                            {isProcessingPayment ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Pagamento'}
                        </button>
                    </form>
                )}
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <h4 className="text-lg font-semibold text-slate-700 mb-3">Histórico Detalhado</h4>

                {combinedHistory.map(month => (
                    <div 
                        key={month.referenciaMesAno} 
                        className={`p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between border ${
                            month.status === 'PAGO' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                        }`}
                    >
                        <div className="flex items-center gap-3 w-full md:w-1/4 mb-2 md:mb-0">
                            <Calendar size={20} className="text-slate-500" />
                            <div>
                                <p className="font-semibold text-slate-800 capitalize">{month.mesDisplay}</p>
                                <p className="text-xs text-slate-500">Vencimento: {month.dataVencimento.toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>

                        <div className='text-left w-full md:w-1/4 mb-2 md:mb-0 md:text-right'>
                             <p className="font-bold text-slate-700">{formatCurrency(month.valorPago)}</p>
                             <p className="text-xs text-slate-500 mt-1">Contrato: {formatCurrency(month.valorMensalidade)}</p>
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-1/2 justify-end">
                            
                            <div className="text-left md:text-right w-full md:w-1/4">
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                    month.status === 'PAGO' ? 'text-emerald-800 bg-emerald-200' : 'text-red-800 bg-red-200'
                                }`}>{month.status}</span>
                                <p className="text-xs text-slate-500 mt-1">{month.dataRegistro}</p>
                            </div>

                            <div className="w-full md:w-auto">
                                {month.status === 'PAGO' ? (
                                    <button 
                                        onClick={() => handleUpdateStatus(month.referenciaMesAno, false)}
                                        className="w-full px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        Reverter
                                    </button>
                                ) : (
                                    // MUDANÇA: Botão marcar pago verde
                                    <button 
                                        onClick={() => handleUpdateStatus(month.referenciaMesAno, true)}
                                        className="w-full px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 transition-colors"
                                    >
                                        Marcar Pago
                                    </button>
                                )}
                            </div>

                            <div className="w-full md:w-auto flex items-center justify-start md:justify-end">
                                {month.comprovanteUrl ? (
                                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                                        <FileText size={18} />
                                        <a 
                                            href={month.comprovanteUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="truncate hover:underline font-medium"
                                            title={month.comprovanteNome}
                                        >
                                            Ver Comprovante
                                        </a>
                                        <button 
                                            onClick={() => handleDeleteComprovante(month.referenciaMesAno, month.comprovanteUrl)}
                                            className="text-red-500 hover:text-red-700 p-1"
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
                                        <input type="file" className="hidden" onChange={(e) => handleUploadFile(e, month.referenciaMesAno)} disabled={uploading} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
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