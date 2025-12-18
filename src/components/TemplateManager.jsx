import React, { useState } from 'react';
import { Search, Plus, Star, Pill, FileBadge, FileCheck, ClipboardList } from 'lucide-react';

const TemplateManager = ({ templates = [], onSelectTemplate, currentType }) => {
  const [search, setSearch] = useState('');

  // Define o ícone e cores com base na aba ativa
  const getStyle = (type) => {
    switch(type) {
      case 'receita': return { icon: <Pill size={18} />, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Receitas' };
      case 'atestado': return { icon: <FileBadge size={18} />, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Atestados' };
      case 'declaracao': return { icon: <FileCheck size={18} />, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Declarações' };
      default: return { icon: <ClipboardList size={18} />, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Evoluções' };
    }
  };

  const style = getStyle(currentType);

  // FILTRO CRUCIAL: Só mostra o template se o tipo for igual à aba ativa
  const filtered = (templates || []).filter(t => 
    t.tipo === currentType && t.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${style.bg} ${style.color}`}>{style.icon}</div>
          <h4 className="font-bold text-slate-700 text-sm">Modelos de {style.label}</h4>
        </div>
        <Plus size={18} className="text-slate-300 cursor-pointer hover:text-blue-500 transition-colors" />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
        <input 
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="Pesquisar modelos..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2 overflow-y-auto max-h-60 pr-1 custom-scrollbar">
        {filtered.length > 0 ? filtered.map(t => (
          <div 
            key={t.id} 
            onClick={() => onSelectTemplate(t)}
            className="group p-4 rounded-2xl border border-slate-50 hover:border-blue-200 hover:bg-blue-50/20 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700">{t.nome}</span>
              <Star size={12} className="text-slate-200 group-hover:text-yellow-400 transition-colors" />
            </div>
          </div>
        )) : (
          <p className="text-center text-[10px] text-slate-400 py-4">Nenhum modelo para esta aba.</p>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;