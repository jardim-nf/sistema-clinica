import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { medicoService } from '../services/medicoService';
import { useToast } from '../contexts/ToastContext';
import { 
  Plus, Search, Edit2, Trash2, Loader2, Stethoscope, Save, X, Phone 
} from 'lucide-react';

const mascaraTelefone = (valor) => {
  if (!valor) return "";
  let v = valor.replace(/\D/g, "");
  v = v.substring(0, 11);
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  return v;
};

export default function Medicos() {
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [medicos, setMedicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [formData, setFormData] = useState({ id: null, nome: '', especialidade: '', crm: '', telefone: '' });
  const clinicaId = userData?.clinicaId || userData?.uid;

  useEffect(() => { if (clinicaId) carregarMedicos(); }, [clinicaId]);

  async function carregarMedicos() {
    setLoading(true);
    try {
      const lista = await medicoService.listar(clinicaId);
      setMedicos(lista);
    } catch (error) {
      showToast("Erro ao carregar médicos", "error");
    } finally {
      setLoading(false);
    }
  }

  function abrirModal(medico = null) {
    if (medico) setFormData(medico);
    else setFormData({ id: null, nome: '', especialidade: '', crm: '', telefone: '' });
    setModalOpen(true);
  }

  const handleChangeTelefone = (e) => {
    const valorFormatado = mascaraTelefone(e.target.value);
    setFormData(prev => ({ ...prev, telefone: valorFormatado }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const payload = { ...formData, clinicaId };
      if (formData.id) {
        await medicoService.atualizar(formData.id, payload);
        showToast("Médico atualizado com sucesso!", "success");
      } else {
        await medicoService.criar(payload);
        showToast("Médico cadastrado com sucesso!", "success");
      }
      setModalOpen(false);
      carregarMedicos();
    } catch (error) {
      showToast("Erro ao salvar as informações.", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id) {
    if (window.confirm("Tem certeza que deseja excluir este médico?")) {
      try {
        await medicoService.excluir(id);
        showToast("Médico excluído com sucesso.", "success");
        carregarMedicos();
      } catch (error) {
        showToast("Erro ao excluir médico.", "error");
      }
    }
  }

  const medicosFiltrados = medicos.filter(m => 
    m.nome.toLowerCase().includes(busca.toLowerCase()) ||
    m.especialidade.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Verde */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-lg text-white">
                <Stethoscope size={24} />
              </div>
              Corpo Clínico
            </h1>
            <p className="text-slate-500 mt-1 ml-12">Gerencie os médicos e especialistas da clínica.</p>
          </div>
          <button onClick={() => abrirModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all">
            <Plus size={20} /> Novo Médico
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center gap-3">
          <Search className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou especialidade..." 
            className="flex-1 outline-none text-slate-700 placeholder:text-slate-400"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {medicosFiltrados.map(medico => (
              <div key={medico.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  {/* MUDANÇA: Avatar com fundo verde claro e texto verde */}
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg border border-emerald-100">
                    {medico.nome.substring(0,2).toUpperCase()}
                  </div>
                  <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => abrirModal(medico)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors" title="Editar"><Edit2 size={16}/></button>
                    <button onClick={() => handleExcluir(medico.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={16}/></button>
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-slate-800 mb-0.5">{medico.nome}</h3>
                {/* MUDANÇA: Texto de especialidade verde */}
                <p className="text-emerald-600 font-bold text-sm mb-3 flex items-center gap-1">
                   <Stethoscope size={14} className="text-emerald-400"/> {medico.especialidade}
                </p>

                <div className="pt-3 border-t border-slate-50 space-y-2">
                    {medico.crm && (
                        <p className="text-slate-500 text-xs font-medium bg-slate-100 inline-block px-2 py-1 rounded">
                            CRM: {medico.crm}
                        </p>
                    )}
                    {medico.telefone && (
                        <p className="text-slate-600 text-sm flex items-center gap-2">
                            <Phone size={14} className="text-slate-400"/> {medico.telefone}
                        </p>
                    )}
                </div>
              </div>
            ))}
            {medicosFiltrados.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
                <Stethoscope size={48} className="text-slate-200 mb-4" />
                <p>Nenhum médico encontrado.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800">{formData.id ? 'Editar Médico' : 'Novo Médico'}</h2>
                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nome Completo</label>
                  {/* MUDANÇA: Focus border verde */}
                  <input required type="text" className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all bg-slate-50 focus:bg-white font-medium" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="Ex: Dr. João Silva" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Especialidade</label>
                  <div className="relative">
                    <Stethoscope size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required type="text" className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all bg-slate-50 focus:bg-white" value={formData.especialidade} onChange={e => setFormData({...formData, especialidade: e.target.value})} placeholder="Ex: Cardiologista" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">CRM / Registro</label>
                        <input type="text" className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all bg-slate-50 focus:bg-white" value={formData.crm} onChange={e => setFormData({...formData, crm: e.target.value})} placeholder="12345/SP" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Telefone</label>
                        <div className="relative">
                             <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                             <input type="text" className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all bg-slate-50 focus:bg-white" value={formData.telefone} onChange={handleChangeTelefone} placeholder="(00) 00000-0000" maxLength={15} />
                        </div>
                    </div>
                </div>
                <div className="pt-2">
                    {/* MUDANÇA: Botão de salvar verde */}
                    <button disabled={salvando} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex justify-center items-center gap-2 mt-2 active:scale-95 disabled:opacity-70 disabled:active:scale-100">
                        {salvando ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} 
                        {formData.id ? 'Salvar Alterações' : 'Cadastrar Médico'}
                    </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}