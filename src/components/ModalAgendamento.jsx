import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check, Trash2, Loader2 } from 'lucide-react';

export default function ModalAgendamento({ isOpen, onClose, onSave, onDelete, dadosIniciais, listaPacientes }) {
  const [formData, setFormData] = useState({
    id: null,
    pacienteId: '',
    data: '',
    hora: '',
    tipo: 'Consulta',
    status: 'agendado',
    valor: '', // Campo do valor
    observacoes: ''
  });
  
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen && dadosIniciais) {
      setFormData({
        id: dadosIniciais.id || null,
        pacienteId: dadosIniciais.pacienteId || '',
        data: dadosIniciais.data || '',
        hora: dadosIniciais.hora || '',
        tipo: dadosIniciais.tipo || 'Consulta',
        status: dadosIniciais.status || 'agendado',
        valor: dadosIniciais.valor || '', // Carrega o valor se existir
        observacoes: dadosIniciais.observacoes || ''
      });
    }
    setSalvando(false);
  }, [dadosIniciais, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (salvando) return;

    setSalvando(true);
    await onSave(formData);
    setSalvando(false);
  };

  const handleDelete = async () => {
     if (salvando) return;
     setSalvando(true);
     await onDelete(formData.id);
     setSalvando(false);
  };

  const pacienteSelecionado = listaPacientes.find(p => p.id === formData.pacienteId);
  const iniciais = pacienteSelecionado ? pacienteSelecionado.nome.substring(0, 2).toUpperCase() : 'PC';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {formData.id ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
            <p className="text-xs text-slate-500">
               {formData.id ? 'Gerencie os dados da consulta' : 'Preencha os dados abaixo'}
            </p>
          </div>
          <button onClick={onClose} disabled={salvando} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* PACIENTE */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Paciente</label>
             <div className="flex items-center gap-3 p-2 border border-slate-200 rounded-xl bg-slate-50">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {iniciais}
                </div>
                <select 
                  className="w-full bg-transparent border-none outline-none text-slate-700 font-medium text-sm h-full py-2"
                  value={formData.pacienteId}
                  onChange={(e) => setFormData({...formData, pacienteId: e.target.value})}
                  required
                >
                  <option value="">Selecione o paciente...</option>
                  {listaPacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
             </div>
          </div>

          {/* DATA E HORA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Data</label>
              <input type="date" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-emerald-500" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Horário</label>
              <input type="time" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-emerald-500" value={formData.hora} onChange={(e) => setFormData({...formData, hora: e.target.value})} required />
            </div>
          </div>

          {/* TIPO, STATUS E VALOR (AQUI ESTÁ O CAMPO) */}
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
             
             {/* --- CAMPO DE VALOR --- */}
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor (R$)</label>
                <input 
                   type="number" 
                   className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-emerald-500 outline-none" 
                   placeholder="0.00" 
                   value={formData.valor} 
                   onChange={(e) => setFormData({...formData, valor: e.target.value})} 
                />
             </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Observações</label>
            <textarea rows={3} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 resize-none" placeholder="Notas..." value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
          </div>

          {/* BOTÕES */}
          <div className="pt-4 mt-2 border-t border-slate-100">
             {formData.id ? (
                <div className="flex flex-col gap-3">
                    <button 
                        type="button" 
                        onClick={handleDelete}
                        disabled={salvando}
                        className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        {salvando ? <Loader2 className="animate-spin"/> : <Trash2 size={20}/>} 
                        {salvando ? 'Processando...' : 'EXCLUIR DEFINITIVAMENTE'}
                    </button>
                    
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} disabled={salvando} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm">Voltar</button>
                        <button type="submit" disabled={salvando} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50">
                            {salvando ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                            Salvar
                        </button>
                    </div>
                </div>
             ) : (
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} disabled={salvando} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm">Voltar</button>
                    <button type="submit" disabled={salvando} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50">
                        {salvando ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                        Confirmar
                    </button>
                </div>
             )}
          </div>
        </form>
      </div>
    </div>
  );
}