import React from 'react';
import { ListChecks, ChevronRight } from 'lucide-react';

const ChecklistPanel = ({ checklists, onSelectChecklist }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500"><ListChecks size={20}/></div>
        <h4 className="font-bold text-slate-700 text-sm">Protocolos</h4>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-60 pr-1">
        {Object.entries(checklists).map(([key, items]) => (
          <div 
            key={key} onClick={() => onSelectChecklist(items.join('\n- '))}
            className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white cursor-pointer transition-all flex justify-between items-center"
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{key.replace('_', ' ')}</span>
            <ChevronRight size={14} className="text-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChecklistPanel;