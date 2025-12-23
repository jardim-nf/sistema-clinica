import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { pacienteService } from '../services/pacienteService';
import ModalPaciente from '../components/ModalPaciente';
import { 
  Loader2, Plus, Users, Search, 
  Edit, Trash2, UserPlus, Phone, Mail, Hash,
  Filter, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- FUNÇÕES DE MÁSCARA ---
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

// Componente Card Mobile
const PacienteCard = ({ paciente, onEdit, onDelete }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    // MUDANÇA: Hover border verde
    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-100 transition-all duration-300"
  >
    <div className="flex justify-between items-start mb-3">
      <div>
        <div className="flex items-center gap-3 mb-1">
          {/* MUDANÇA: Avatar verde */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
            <Users size={18} className="text-emerald-600" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 truncate">{paciente.nome}</h3>
        </div>
        <div className="flex items-center gap-2 mb-1">
          {/* MUDANÇA: Badge de status verde */}
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            paciente.status === 'ativo' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-slate-50 text-slate-600 border border-slate-100'
          }`}>
            {paciente.status || 'ativo'}
          </span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(paciente.id);
        }}
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
      >
        <Trash2 size={18} />
      </button>
    </div>
    
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Phone size={14} className="text-slate-400" />
        <span className="text-slate-600 font-medium">{mascaraTelefone(paciente.telefone)}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Mail size={14} className="text-slate-400" />
        <span className="text-slate-600 truncate">{paciente.email || 'N/A'}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Hash size={14} className="text-slate-400" />
        <span className="text-slate-600 font-mono">{mascaraCPF(paciente.cpf)}</span>
      </div>
    </div>
    
    <button
      onClick={() => onEdit(paciente)}
      // MUDANÇA: Botão editar verde claro
      className="mt-4 w-full py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 rounded-xl font-bold text-sm hover:from-emerald-100 hover:to-teal-100 transition-all flex items-center justify-center gap-2 border border-emerald-100"
    >
      <Edit size={16} /> Editar Paciente
    </button>
  </motion.div>
);

// Componente Linha Tabela Desktop
const PacienteRow = ({ paciente, onEdit, onDelete }) => (
  <motion.tr 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    // MUDANÇA: Hover com fundo verde suave
    className="border-b hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-teal-50/30 transition-all duration-200 group cursor-pointer"
    onClick={() => onEdit(paciente)}
  >
    <td className="p-4">
      <div className="flex items-center gap-3">
        {/* MUDANÇA: Ícone verde */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
          <Users size={16} className="text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-slate-800">{paciente.nome}</p>
          <p className="text-xs text-slate-400">ID: {paciente.id?.slice(-8)}</p>
        </div>
      </div>
    </td>
    
    <td className="p-4">
      <div className="flex items-center gap-2">
        <Phone size={14} className="text-slate-400" />
        <span className="text-slate-700 font-medium">{mascaraTelefone(paciente.telefone)}</span>
      </div>
    </td>
    
    <td className="p-4">
      <div className="flex items-center gap-2">
        <Mail size={14} className="text-slate-400" />
        <span className="text-slate-700 truncate max-w-[200px]">{paciente.email || '—'}</span>
      </div>
    </td>
    
    <td className="p-4">
      <div className="flex items-center gap-2">
        <Hash size={14} className="text-slate-400" />
        <span className="font-mono text-slate-700">{mascaraCPF(paciente.cpf)}</span>
      </div>
    </td>
    
    <td className="p-4">
      <div className="flex items-center gap-2">
        {/* MUDANÇA: Status verde */}
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
          paciente.status === 'ativo' 
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {paciente.status || 'ativo'}
        </span>
      </div>
    </td>
    
    <td className="p-4">
      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(paciente);
          }}
          // MUDANÇA: Botão editar contorno verde
          className="p-2 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg transition-all border border-emerald-200 hover:border-emerald-600"
          title="Editar"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(paciente.id);
          }}
          className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all border border-red-200 hover:border-red-500"
          title="Excluir"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </td>
  </motion.tr>
);

export default function Pacientes() {
  const { userData } = useAuth();
  const { showToast } = useToast(); 

  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [pacienteToEdit, setPacienteToEdit] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    novosHoje: 0
  });

  const idDaClinica = userData?.clinicaId;

  const fetchPacientes = useCallback(async () => {
    if (!idDaClinica) return;

    setLoading(true);
    try {
      const data = await pacienteService.listar(idDaClinica); 
      
      if (Array.isArray(data)) {
        setPacientes(data);
        
        const hoje = new Date().toISOString().split('T')[0];
        const novosHoje = data.filter(p => {
          const dataCriacao = p.createdAt?.split('T')[0];
          return dataCriacao === hoje;
        }).length;
        
        setStats({
          total: data.length,
          ativos: data.filter(p => p.status === 'ativo' || !p.status).length,
          novosHoje
        });
      } else {
        setPacientes([]);
        setStats({ total: 0, ativos: 0, novosHoje: 0 });
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar pacientes.", "error");
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
      showToast("Clínica não identificada.", "error");
      return;
    }
    
    const cpfLimpo = dados.cpf?.replace(/\D/g, '');
    
    if (cpfLimpo && cpfLimpo.length === 11) {
      const pacienteExistente = await pacienteService.buscarPorCPF(idDaClinica, dados.cpf);
      
      if (pacienteExistente && pacienteExistente.id !== dados.id) {
        showToast(`O CPF ${mascaraCPF(cpfLimpo)} já está cadastrado para ${pacienteExistente.nome}.`, "error");
        return;
      }
    }

    const payload = {
      ...dados,
      userId: idDaClinica, 
    };

    try {
      if (dados.id) {
        await pacienteService.atualizar(dados.id, payload);
        showToast("Paciente atualizado com sucesso!", "success");
      } else {
        await pacienteService.criar(payload);
        showToast("Paciente cadastrado com sucesso!", "success");
      }
      
      setModalOpen(false);
      await fetchPacientes(); 
    } catch (error) {
      console.error(error);
      const msg = error.code === 'permission-denied' ? "Permissão insuficiente." : "Erro ao salvar paciente.";
      showToast(msg, "error");
    }
  };

  const handleExcluir = async (pacienteId) => {
    if (window.confirm("Tem certeza que deseja excluir este paciente? Esta ação é irreversível.")) {
      try {
        await pacienteService.excluir(pacienteId); 
        showToast("Paciente excluído.", "success");
        await fetchPacientes();
      } catch (error) {
        console.error(error);
        showToast("Erro ao excluir paciente.", "error");
      }
    }
  };

  const handleOpenModal = (paciente = null) => {
    const pacienteSeguro = paciente ? {
      ...paciente,
      cpf: paciente.cpf || '',
      telefone: paciente.telefone || '',
      email: paciente.email || '',
      dataNascimento: paciente.dataNascimento || '',
    } : null;

    setPacienteToEdit(pacienteSeguro);
    setModalOpen(true);
  };

  const filteredPacientes = pacientes.filter(p => 
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cpf?.includes(searchTerm.replace(/\D/g, '')) ||
    p.telefone?.includes(searchTerm.replace(/\D/g, ''))
  );

  return (
    // MUDANÇA: Gradiente de fundo verde suave
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-4 mb-3">
                {/* MUDANÇA: Ícone principal verde */}
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-lg">
                  <Users size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-slate-800">Gestão de Pacientes</h1>
                  <p className="text-slate-500 mt-1">Gerencie todos os pacientes da sua clínica</p>
                </div>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Total de Pacientes</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
                    </div>
                    {/* MUDANÇA: Ícone stats verde */}
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Users className="text-emerald-600" size={20} />
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Pacientes Ativos</p>
                      {/* MUDANÇA: Texto verde */}
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.ativos}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                      <UserPlus className="text-emerald-600" size={20} />
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Novos Hoje</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{stats.novosHoje}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                      <UserPlus className="text-amber-600" size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botão principal */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOpenModal(null)}
              // MUDANÇA: Botão principal verde
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-emerald-500/20 transition-all self-start"
            >
              <Plus size={22} /> Novo Paciente
            </motion.button>
          </div>

          {/* Barra de busca e filtros */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail, CPF ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  // MUDANÇA: Focus ring verde
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:bg-white transition-all text-slate-700"
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setViewMode('grid')}
                  // MUDANÇA: Botão toggle verde
                  className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Grid
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                    viewMode === 'list' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Lista
                </button>
                <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all">
                  <Filter size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-20">
              {/* MUDANÇA: Spinner verde */}
              <Loader2 size={48} className="animate-spin mx-auto mb-4 text-emerald-600" />
              <p className="text-slate-500 font-medium">Carregando pacientes...</p>
            </div>
          ) : (
            <>
              {/* Vista Grid (Mobile/Tablet) */}
              {viewMode === 'grid' ? (
                <div className="p-4 md:p-6">
                  <AnimatePresence>
                    {filteredPacientes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPacientes.map(paciente => (
                          <PacienteCard 
                            key={paciente.id} 
                            paciente={paciente} 
                            onEdit={handleOpenModal}
                            onDelete={handleExcluir}
                          />
                        ))}
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                      >
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-emerald-100 rounded-full flex items-center justify-center">
                          <Users size={40} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum paciente encontrado</h3>
                        <p className="text-slate-500 mb-6">
                          {searchTerm ? 'Tente ajustar sua busca.' : 'Comece cadastrando um novo paciente.'}
                        </p>
                        <button
                          onClick={() => handleOpenModal(null)}
                          // MUDANÇA: Botão empty state verde
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2"
                        >
                          <Plus size={20} /> Cadastrar Primeiro Paciente
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* Vista Tabela (Desktop) */
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      {/* MUDANÇA: Header tabela fundo suave verde */}
                      <tr className="bg-gradient-to-r from-slate-50 to-emerald-50 border-b">
                        <th className="p-4 text-left text-sm font-bold text-slate-700 uppercase">Paciente</th>
                        <th className="p-4 text-left text-sm font-bold text-slate-700 uppercase">Telefone</th>
                        <th className="p-4 text-left text-sm font-bold text-slate-700 uppercase">E-mail</th>
                        <th className="p-4 text-left text-sm font-bold text-slate-700 uppercase">CPF</th>
                        <th className="p-4 text-left text-sm font-bold text-slate-700 uppercase">Status</th>
                        <th className="p-4 text-right text-sm font-bold text-slate-700 uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredPacientes.map(paciente => (
                          <PacienteRow 
                            key={paciente.id} 
                            paciente={paciente} 
                            onEdit={handleOpenModal}
                            onDelete={handleExcluir}
                          />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                  
                  {filteredPacientes.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-emerald-100 rounded-full flex items-center justify-center">
                        <Users size={40} className="text-slate-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum paciente encontrado</h3>
                      <p className="text-slate-500">
                        {searchTerm ? 'Tente ajustar sua busca.' : 'Comece cadastrando um novo paciente.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer com contagem */}
              <div className="border-t border-slate-100 bg-slate-50 p-4">
                <div className="flex justify-between items-center">
                  <p className="text-slate-600 text-sm">
                    Mostrando <span className="font-bold">{filteredPacientes.length}</span> de <span className="font-bold">{pacientes.length}</span> pacientes
                  </p>
                  {filteredPacientes.length > 0 && (
                    <div className="flex gap-2">
                      {/* MUDANÇA: Botão exportar hover verde */}
                      <button className="px-4 py-2 text-slate-600 hover:text-emerald-600 text-sm font-medium flex items-center gap-2">
                        <Download size={16} /> Exportar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <ModalPaciente
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSalvar}
        paciente={pacienteToEdit}
      />

      {/* Botão flutuante para mobile */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => handleOpenModal(null)}
        // MUDANÇA: Botão FAB verde
        className="fixed bottom-6 right-6 lg:hidden p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full shadow-2xl z-50"
      >
        <Plus size={24} />
      </motion.button>
    </div>
  );
}