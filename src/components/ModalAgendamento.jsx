import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Loader2, Stethoscope } from 'lucide-react';

export default function ModalAgendamento({ isOpen, onClose, onSave, onDelete, dadosIniciais, listaPacientes, listaMedicos }) {
  const [formData, setFormData] = useState({
    id: null,
    pacienteId: '',
    medicoId: '',
    data: '',
    hora: '',
    tipo: 'Consulta',
    status: 'agendado',
    valor: '',
    observacoes: ''
  });
  
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (dadosIniciais) {
        setFormData({
          id: dadosIniciais.id || null,
          pacienteId: dadosIniciais.pacienteId || '',
          medicoId: dadosIniciais.medicoId || '',
          data: dadosIniciais.data || '',
          hora: dadosIniciais.hora || '',
          tipo: dadosIniciais.tipo || 'Consulta',
          status: dadosIniciais.status || 'agendado',
          valor: dadosIniciais.valor || '',
          observacoes: dadosIniciais.observacoes || ''
        });
      } else {
        setFormData({
          id: null,
          pacienteId: '',
          medicoId: '',
          data: '',
          hora: '',
          tipo: 'Consulta',
          status: 'agendado',
          valor: '',
          observacoes: ''
        });
      }
    }
    setSalvando(false);
  }, [dadosIniciais, isOpen]);

  if (!isOpen) return null;

  const medicoSelecionado = listaMedicos?.find(m => m.id === formData.medicoId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    
    const dadosParaSalvar = {
        ...formData,
        medicoNome: medicoSelecionado?.nome || '',
        medicoEspecialidade: medicoSelecionado?.especialidade || ''
    };

    await onSave(dadosParaSalvar);
    setSalvando(false);
  };

  const handleDelete = async () => {
     if (salvando) return;
     setSalvando(true);
     await onDelete(formData.id);
     setSalvando(false);
  };

  const pacienteSel = listaPacientes?.find(p => p.id === formData.pacienteId);
  const iniciais = pacienteSel ? pacienteSel.nome.substring(0, 2).toUpperCase() : 'PC';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {formData.id ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
          </div>
          <button onClick={onClose} disabled={salvando} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* SELEÇÃO DE MÉDICO */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Profissional / Médico</label>
             {/* MUDANÇA: Border e Focus verde */}
             <div className="flex items-center gap-3 p-2 border border-slate-200 rounded-xl bg-slate-50 focus-within:border-emerald-500 focus-within:bg-white transition-colors">
                {/* MUDANÇA: Ícone verde */}
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Stethoscope size={20} />
                </div>
                <div className="flex-1">
                    <select 
                      className="w-full bg-transparent border-none outline-none text-slate-700 font-bold text-sm h-full py-1"
                      value={formData.medicoId}
                      onChange={(e) => setFormData({...formData, medicoId: e.target.value})}
                      required
                    >
                      <option value="">Selecione o médico...</option>
                      {listaMedicos?.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} - {m.especialidade}</option>
                      ))}
                    </select>
                </div>
             </div>
             {medicoSelecionado && (
                // MUDANÇA: Texto verde
                <p className="text-xs text-emerald-600 mt-1 ml-2 font-medium">Especialidade: {medicoSelecionado.especialidade}</p>
             )}
          </div>

          {/* SELEÇÃO DE PACIENTE */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Paciente</label>
             <div className="flex items-center gap-3 p-2 border border-slate-200 rounded-xl bg-slate-50">
                {/* MUDANÇA: Avatar verde teal */}
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {iniciais}
                </div>
                <select 
                  className="w-full bg-transparent border-none outline-none text-slate-700 font-medium text-sm h-full py-2"
                  value={formData.pacienteId}
                  onChange={(e) => setFormData({...formData, pacienteId: e.target.value})}
                  required
                >
                  <option value="">Selecione o paciente...</option>
                  {listaPacientes?.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
             </div>
          </div>

          {/* DATA E HORA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Data</label>
              <input type="date" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Horário</label>
              <input type="time" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium" value={formData.hora} onChange={(e) => setFormData({...formData, hora: e.target.value})} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo</label>
                <select className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                   <option>Consulta</option>
                   <option>Retorno</option>
                   <option>Exame</option>
                </select>
             </div>
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                   <option value="agendado">Agendado</option>
                   <option value="confirmado">Confirmado</option>
                   <option value="realizado">Realizado</option>
                </select>
             </div>
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor (R$)</label>
                <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="0.00" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} />
             </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Observações</label>
            <textarea rows={2} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 resize-none" value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 flex gap-3">
             {formData.id && (
                <button type="button" onClick={handleDelete} disabled={salvando} className="px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold transition disabled:opacity-50">
                    <Trash2 size={20}/>
                </button>
             )}
             <button type="button" onClick={onClose} disabled={salvando} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm">Cancelar</button>
             {/* MUDANÇA: Botão salvar verde */}
             <button type="submit" disabled={salvando} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50">
                 {salvando ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>} Salvar
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}