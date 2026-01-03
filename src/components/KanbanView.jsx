// src/components/KanbanView.jsx
import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import KanbanBoard from './KanbanAgendamentos'; 

const KanbanView = ({ selectedDate, navegarDia, kanbanData, onStatusChange }) => {
  return (
    // Adicionado max-w-full aqui para impedir que este container cresça além da tela
    <div className="h-[calc(100vh-200px)] min-h-[500px] animate-in fade-in zoom-in duration-300 flex flex-col w-full max-w-full overflow-hidden">
      
      {/* Seletor de Data */}
      <div className="flex items-center justify-center mb-4 bg-white p-2 rounded-xl shadow-sm border border-slate-100 max-w-md mx-auto w-full">
        <button onClick={() => navegarDia(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft /></button>
        <div className="px-6 text-center flex-1">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Visualizando Dia</span>
          <span className="text-lg font-bold text-slate-800">{format(selectedDate, 'dd/MM/yyyy')}</span>
        </div>
        <button onClick={() => navegarDia(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight /></button>
      </div>

      {/* Área do Kanban */}
      <div className="flex-1 w-full max-w-full overflow-hidden relative">
        <KanbanBoard agendamentos={kanbanData} onStatusChange={onStatusChange} />
      </div>
    </div>
  );
};

export default KanbanView;