// src/pages/Admin/ControleMaster.jsx - Versão com uso de Service real

import React, { useState, useEffect } from 'react';
import { Gavel, CalendarCheck, UserCog, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getGlobalAppointments } from '../../services/masterService'; // IMPORTAÇÃO CORRETA

export default function ControleMaster() {
    const { userData } = useAuth();
    const { showToast } = useToast();
    const [agendamentosMaster, setAgendamentosMaster] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData?.role !== 'super_admin') return;

        const fetchAppointments = async () => {
            setLoading(true);
            try {
                const data = await getGlobalAppointments();
                setAgendamentosMaster(data);
                console.log(`DEBUG: Carregados ${data.length} agendamentos globais.`);
            } catch (error) {
                console.error("Erro ao buscar agendamentos globais:", error);
                showToast('Erro ao carregar agendamentos globais.', 'error');
            } finally {
                setLoading(false);
            }
        };
        
        fetchAppointments();
        
    }, [userData, showToast]);

    if (userData?.role !== 'super_admin') {
        return <div className="text-red-500">Acesso negado. Apenas o Administrador Geral pode acessar esta página.</div>;
    }
    
    // Componente para a seção de Logs (apenas placeholder por enquanto)
    const AuditoriaLog = () => (
        <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
            <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                <UserCog size={24} className="text-red-600" /> Logs de Acesso e Auditoria
            </h2>
            <p className='text-sm text-slate-500'>
                Implementação pendente: Visualização de logs de eventos críticos.
            </p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Gavel size={32} className="text-red-600" />
                <h1 className="text-3xl font-bold text-slate-800">Controle Master de Sistema</h1>
            </div>

            <p className="text-slate-600 border-l-4 border-red-400 pl-4 py-1 bg-red-50/50 p-2 rounded-md">
                Ferramentas de auditoria e controle de alto nível para monitoramento e segurança da plataforma.
            </p>

            <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                    <CalendarCheck size={24} className="text-blue-600" /> Agendamentos Globais
                </h2>
                <p className='text-sm text-slate-500'>Visualização de todos os agendamentos marcados em todas as clínicas ativas.</p>
                
                {loading ? (
                    <div className="text-center py-6 text-slate-500">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                        Buscando todos os agendamentos...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID Clínica (UID)</th>
                                    <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Paciente ID</th>
                                    <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                                    <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Hora</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {agendamentosMaster.map((ag) => (
                                    <tr key={ag.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-medium text-blue-600 text-xs">{ag.clinicaId || 'N/A'}</td>
                                        <td className="p-4 text-slate-700 text-xs">{ag.pacienteId || 'N/A'}</td> 
                                        <td className="p-4 text-sm text-slate-600">{ag.data ? new Date(ag.data).toLocaleDateString() : 'N/A'}</td>
                                        <td className="p-4 text-sm text-slate-600">{ag.hora || 'N/A'}</td>
                                    </tr>
                                ))}
                                {agendamentosMaster.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-4 text-center text-slate-500">Nenhum agendamento encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <AuditoriaLog />
        </div>
    );
}