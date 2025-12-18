// src/pages/Pacientes.jsx - FINALIZADO: Correção de Propagação e Robustez de Dados (handleOpenModal)

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { pacienteService } from '../services/pacienteService';
import ModalPaciente from '../components/ModalPaciente';
import { Loader2, Plus, Users, Search, Edit, Trash2 } from 'lucide-react';

// --- FUNÇÕES DE MÁSCARA (Para exibição na Tabela) ---

const mascaraCPF = (valor) => {
    if (!valor) return 'N/A';
    const digits = valor.replace(/\D/g, ''); 
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1'); 
};

const mascaraTelefone = (valor) => {
    if (!valor) return 'N/A';
    const digits = valor.replace(/\D/g, '');
    if (digits.length === 11) { 
        return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (digits.length === 10) { 
        return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return valor; 
};
// ---------------------------------------------------


// Componente para a linha da tabela (PacienteRow)
const PacienteRow = ({ paciente, onEdit, onDelete }) => (
    <tr 
        className="border-b hover:bg-slate-50 cursor-pointer" 
        onClick={() => onEdit(paciente)} // CLIQUE NA LINHA: Abre a edição
    >
        <td className="p-3 font-medium text-slate-800">{paciente.nome}</td>
        
        {/* Aplica Máscara no Telefone */}
        <td className="p-3 text-sm text-slate-600 hidden sm:table-cell">
            {mascaraTelefone(paciente.telefone)}
        </td>
        
        <td className="p-3 text-sm text-slate-600 hidden md:table-cell">{paciente.email || 'N/A'}</td>
        
        {/* Aplica Máscara no CPF */}
        <td className="p-3 text-sm text-slate-600 hidden lg:table-cell">
            {mascaraCPF(paciente.cpf)}
        </td>
        
        <td className="p-3 text-right">
            <div className="flex justify-end space-x-2">
                
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // CRÍTICO: Impede que o clique suba para a linha
                        onDelete(paciente.id);
                    }}
                    className="p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-full transition-colors"
                    title="Excluir"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </td>
    </tr>
);

export default function Pacientes() {
    const { userData } = useAuth();
    const { showToast } = useToast(); 

    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [pacienteToEdit, setPacienteToEdit] = useState(null);

    const idDaClinica = userData?.clinicaId;

    const fetchPacientes = useCallback(async () => {
        if (!idDaClinica) return;

        setLoading(true);
        try {
            const data = await pacienteService.listar(idDaClinica); 
            
            if (Array.isArray(data)) {
                setPacientes(data);
            } else {
                 setPacientes([]);
            }
        } catch (error) {
            console.error(error);
            showToast({ message: "Erro ao carregar pacientes.", type: "error" });
            setPacientes([]); 
        } finally {
            setLoading(false);
        }
    }, [idDaClinica, showToast]);

    useEffect(() => {
        fetchPacientes();
    }, [fetchPacientes]);

    const handleSalvar = async (dados) => {
        if (!idDaClinica) {
            showToast({ message: "Clínica não identificada.", type: "error" });
            return;
        }
        
        // --- 1. VALIDAÇÃO DE UNICIDADE DO CPF ---
        const cpfLimpo = dados.cpf?.replace(/\D/g, '');
        
        // Só valida a unicidade se o CPF tiver sido preenchido completamente (11 dígitos limpos)
        if (cpfLimpo && cpfLimpo.length === 11) {
            // Busca pelo CPF que veio do formulário (o serviço fará a limpeza final para a query)
            const pacienteExistente = await pacienteService.buscarPorCPF(idDaClinica, dados.cpf);
            
            // Se encontrou um paciente E não estamos editando o paciente encontrado (impedindo duplicação)
            if (pacienteExistente && pacienteExistente.id !== dados.id) {
                showToast({ 
                    message: `O CPF ${mascaraCPF(cpfLimpo)} já está cadastrado para ${pacienteExistente.nome}. O cadastro foi bloqueado.`, 
                    type: "error" 
                });
                return; // BLOQUEIA O CADASTRO DUPLICADO
            }
        }
        // Se o CPF está em branco ou incompleto (menos de 11 dígitos), a validação de unicidade é ignorada, e o cadastro prossegue.


        const payload = {
            ...dados,
            userId: idDaClinica, 
        };

        try {
            if (dados.id) {
                await pacienteService.atualizar(dados.id, payload);
                showToast({ message: "Paciente atualizado com sucesso!", type: "success" });
            } else {
                await pacienteService.criar(payload);
                showToast({ message: "Paciente cadastrado com sucesso!", type: "success" });
            }
            
            setModalOpen(false);
            await fetchPacientes(); 
        } catch (error) {
            console.error(error);
            const msg = error.code === 'permission-denied' ? "Permissão insuficiente ou dado de clínica ausente." : "Erro ao salvar paciente.";
            showToast({ message: msg, type: "error" }); 
        }
    };

    const handleExcluir = async (pacienteId) => {
        if (window.confirm("Tem certeza que deseja excluir este paciente? Esta ação é irreversível.")) {
            try {
                await pacienteService.excluir(pacienteId); 
                
                showToast({ message: "Paciente excluído.", type: "success" });
                
                await fetchPacientes();
            } catch (error) {
                console.error(error);
                showToast({ message: "Erro ao excluir paciente. Verifique as regras de segurança.", type: "error" }); 
            }
        }
    };

    // --- FUNÇÃO CORRIGIDA PARA GARANTIR DADOS ROBUSTOS ---
    const handleOpenModal = (paciente = null) => {
        
        // CRÍTICO: Cria uma cópia limpa do objeto, garantindo que campos sensíveis
        // que o ModalPaciente pode tentar formatar sejam sempre strings.
        const pacienteSeguro = paciente ? {
            ...paciente,
            cpf: paciente.cpf || '',
            telefone: paciente.telefone || '',
            email: paciente.email || '',
            dataNascimento: paciente.dataNascimento || '',
            // Adicione outros campos do modal se necessário:
            // cep: paciente.cep || '',
            // endereco: paciente.endereco || '',
            
        } : null;

        setPacienteToEdit(pacienteSeguro);
        setModalOpen(true);
    };
    // ----------------------------------------------------

    const filteredPacientes = pacientes.filter(p => 
        p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf?.includes(searchTerm.replace(/\D/g, '')) 
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
                <Users size={32} className="text-indigo-600" />
                <h1 className="text-3xl font-bold text-slate-800">Gestão de Pacientes</h1>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    
                    {/* Campo de Busca */}
                    <div className="relative w-full md:w-1/3">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, e-mail ou CPF"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                        />
                    </div>
                    
                    {/* Botão de Cadastro */}
                    <button
                        onClick={() => handleOpenModal(null)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition w-full md:w-auto justify-center"
                    >
                        <Plus size={20} /> Novo Paciente
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-slate-500">
                        <Loader2 size={32} className="animate-spin mx-auto mb-4 text-indigo-500" />
                        Carregando pacientes...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Telefone</th>
                                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">E-mail</th>
                                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">CPF</th>
                                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filteredPacientes.map(paciente => (
                                    <PacienteRow 
                                        key={paciente.id} 
                                        paciente={paciente} 
                                        onEdit={handleOpenModal}
                                        onDelete={handleExcluir}
                                    />
                                ))}
                                {filteredPacientes.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-4 text-center text-slate-500">Nenhum paciente encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <ModalPaciente
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSalvar}
                paciente={pacienteToEdit}
            />
        </div>
    );
}