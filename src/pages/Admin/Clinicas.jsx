// src/pages/Admin/Clinicas.jsx - GESTÃO DE CLÍNICAS COM MELHORIA DE UX

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Lock, Unlock, Search, 
    CheckCircle, AlertTriangle // <-- NOVOS ÍCONES IMPORTADOS PARA STATUS
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getClinicas, toggleClinicaBlockStatus } from '../../services/masterService';
import ConfirmModal from '../../components/ConfirmModal'; 


// --- Componente de Linha (ClinicaRow) ---
const ClinicaRow = ({ clinica, handleToggleBlock }) => {
    const status = clinica.isBlocked ? 'BLOQUEADA' : 'ATIVA';
    const ActionIcon = clinica.isBlocked ? Unlock : Lock; 
    const actionText = clinica.isBlocked ? 'Desbloquear' : 'Bloquear';

    // Definição de Ícone e Classes para o Status
    const StatusIcon = clinica.isBlocked ? AlertTriangle : CheckCircle;
    const statusClasses = clinica.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';

    return (
        <tr className="border-b hover:bg-slate-50">
            {/* REDUÇÃO DE DENSIDADE: p-4 -> p-3 */}
            <td className="p-3 font-medium text-slate-800">{clinica.nomeFantasia || clinica.nomeClinica}</td>
            <td className="p-3 text-sm text-slate-600">{clinica.email}</td>
            <td className="p-3">
                {/* STATUS COM ÍCONE */}
                <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusClasses}`}>
                    <StatusIcon size={14} className="mr-1" />
                    {status}
                </span>
            </td>
            <td className="p-3">
                <button
                    onClick={() => handleToggleBlock(clinica)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                        clinica.isBlocked ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                >
                    <ActionIcon size={14} /> {actionText}
                </button>
            </td>
        </tr>
    );
};
// ----------------------------------------------------------------------


export default function Clinicas() {
    const { userData } = useAuth();
    const { showToast } = useToast();
    const [clinicas, setClinicas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [confirmation, setConfirmation] = useState(null);

    const fetchClinicas = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getClinicas();
            setClinicas(data);
        } catch (error) {
            showToast('Erro ao carregar lista de clínicas.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if(userData?.role === 'super_admin') fetchClinicas();
    }, [fetchClinicas, userData]);

    const handleToggleBlock = (clinica) => {
        const action = clinica.isBlocked ? 'DESBLOQUEAR' : 'BLOQUEAR';
        const type = clinica.isBlocked ? 'success' : 'warning';
        const title = `Confirmar Ação: ${action}`;
        const message = `Você tem certeza que deseja **${action}** o acesso da clínica **${clinica.nomeFantasia || clinica.nomeClinica}**? O acesso do administrador será imediatamente ${action === 'BLOQUEAR' ? 'interrompido' : 'restaurado'}.`;

        setConfirmation({ 
            title, 
            message, 
            confirmText: action,
            type,
            onConfirm: () => {
                setConfirmation(null); 
                processToggleBlock(clinica.uid, !clinica.isBlocked); 
            },
            onCancel: () => setConfirmation(null)
        });
    };

    const processToggleBlock = async (clinicaId, newBlockStatus) => {
        try {
            await toggleClinicaBlockStatus(clinicaId, newBlockStatus);
            showToast(`Clínica ${newBlockStatus ? 'bloqueada' : 'desbloqueada'} com sucesso!`, 'success');
            fetchClinicas();
        } catch (error) {
            console.error("Erro ao alterar status de bloqueio:", error);
            showToast('Falha ao alterar status de bloqueio.', 'error');
        }
    };
    
    const filteredClinicas = clinicas.filter(c => 
        c.nomeFantasia?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.nomeClinica?.toLowerCase().includes(searchTerm.toLowerCase()) || // Considera nomeClinica para busca
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (userData?.role !== 'super_admin') {
        return <div className="text-red-500">Acesso negado.</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Gestão de Clínicas</h1>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-slate-700">Lista de Clínicas</h2>
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por clínica ou e-mail"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-slate-500">Carregando clínicas...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Clínica</th> {/* p-4 -> p-3 */}
                                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail Admin</th> {/* p-4 -> p-3 */}
                                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status Acesso</th> {/* p-4 -> p-3 */}
                                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th> {/* p-4 -> p-3 */}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filteredClinicas.map(clinica => (
                                    <ClinicaRow 
                                        key={clinica.uid} 
                                        clinica={clinica} 
                                        handleToggleBlock={handleToggleBlock}
                                    />
                                ))}
                            </tbody>
                        </table>
                        {filteredClinicas.length === 0 && (
                            <div className="text-center py-4 text-slate-500">Nenhuma clínica encontrada.</div>
                        )}
                    </div>
                )}
            </div>

            {confirmation && (
                <ConfirmModal 
                    title={confirmation.title}
                    message={confirmation.message}
                    onConfirm={confirmation.onConfirm}
                    onCancel={confirmation.onCancel}
                    confirmText={confirmation.confirmText}
                    type={confirmation.type}
                />
            )}
        </div>
    );
}