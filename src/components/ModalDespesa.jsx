import React, { useState } from 'react';
import { X, Check, Loader2, DollarSign } from 'lucide-react';

export default function ModalDespesa({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0], // Hoje
    categoria: 'fixa'
  });
  const [salvando, setSalvando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor) return;

    setSalvando(true);
    await onSave({
        ...formData,
        tipo: 'despesa',
        hora: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
    });
    setSalvando(false);
    
    // Limpar form
    setFormData({ descricao: '', valor: '', data: new Date().toISOString().split('T')[0], categoria: 'fixa' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
            <DollarSign size={20}/> Nova Despesa
          </h2>
          <button onClick={onClose} disabled={salvando} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
            <input 
              type="text" 
              placeholder="Ex: Conta de Luz, Aluguel..." 
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-red-500"
              value={formData.descricao}
              onChange={e => setFormData({...formData, descricao: e.target.value})}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor (R$)</label>
               <input 
                 type="number" 
                 step="0.01"
                 placeholder="0,00" 
                 className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-red-500"
                 value={formData.valor}
                 onChange={e => setFormData({...formData, valor: e.target.value})}
                 required
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data</label>
               <input 
                 type="date" 
                 className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-red-500"
                 value={formData.data}
                 onChange={e => setFormData({...formData, data: e.target.value})}
                 required
               />
            </div>
          </div>

          <div className="pt-2">
             <button 
               type="submit" 
               disabled={salvando} 
               className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 disabled:opacity-70 transition"
             >
                {salvando ? <Loader2 className="animate-spin"/> : <Check size={20}/>}
                Lançar Despesa
             </button>
          </div>

        </form>
      </div>
    </div>
  );
}