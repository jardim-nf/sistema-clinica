// src/components/KanbanAgendamentos.jsx
import React, { useState, useMemo } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  TouchSensor 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, CheckCircle2, Stethoscope, Armchair } from 'lucide-react';

const COLUNAS = [
  { id: 'agendado', titulo: 'Agendado', cor: 'bg-slate-50 border-slate-200', icone: <Clock size={16} className="text-slate-500"/> },
  { id: 'confirmado', titulo: 'Na Recepção', cor: 'bg-yellow-50/80 border-yellow-200', icone: <Armchair size={16} className="text-yellow-600"/> },
  { id: 'em_atendimento', titulo: 'Em Atendimento', cor: 'bg-blue-50/80 border-blue-200', icone: <Stethoscope size={16} className="text-blue-600"/> },
  { id: 'realizado', titulo: 'Finalizado', cor: 'bg-blue-50/80 border-blue-200', icone: <CheckCircle2 size={16} className="text-blue-600"/> }
];

function KanbanCard({ agendamento, isOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: agendamento.id,
    data: { ...agendamento }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    touchAction: 'none' 
  };

  if (isOverlay) {
    return (
        <div className="bg-white p-3 rounded-xl shadow-2xl border-2 border-blue-500 cursor-grabbing w-full rotate-2 scale-105">
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-800">{agendamento.pacienteNome || 'Paciente'}</span>
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">{agendamento.hora}</span>
            </div>
        </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 cursor-grab active:cursor-grabbing group mb-3 transition-all"
    >
      <div className="flex justify-between items-start">
          <div className="flex flex-col overflow-hidden">
            <h4 className="font-bold text-sm text-slate-700 truncate pr-2">{agendamento.pacienteNome || 'Sem nome'}</h4>
            <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{agendamento.tipo || 'Consulta'}</span>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
             {agendamento.hora}
          </div>
      </div>
      <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
         <div className="flex items-center gap-2 text-xs text-slate-500 overflow-hidden">
             <div className="w-5 h-5 min-w-[1.25rem] rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                 {agendamento.medicoNome ? agendamento.medicoNome.substring(0,1) : 'M'}
             </div>
             <span className="truncate">{agendamento.medicoNome || 'Sem médico'}</span>
         </div>
         {agendamento.valor > 0 && (
             <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded shrink-0 ml-2">R$ {agendamento.valor}</span>
         )}
      </div>
    </div>
  );
}

function KanbanColumn({ col, agendamentos }) {
  const { setNodeRef } = useSortable({ id: col.id });

  return (
    <div 
      ref={setNodeRef} 
      // MUDANÇA CRÍTICA AQUI: min-w-[85%] em vez de 85vw
      // Isso garante que ele respeite o tamanho do pai (que tem margens)
      className="flex-1 min-w-[85%] md:min-w-[280px] snap-center flex flex-col h-full rounded-2xl border border-slate-200 bg-slate-50/50 p-2"
      style={{ borderColor: col.cor.includes('border') ? undefined : 'transparent' }} // Fallback simples
    >
      <div className={`flex items-center justify-between p-2 mb-2 rounded-xl border ${col.cor} bg-white shadow-sm`}>
         <div className="flex items-center gap-2">
            {col.icone}
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">{col.titulo}</h3>
         </div>
         <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-md">{agendamentos.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-slate-200">
        <SortableContext items={agendamentos.map(a => a.id)} strategy={verticalListSortingStrategy}>
            {agendamentos.map((ag) => (<KanbanCard key={ag.id} agendamento={ag} />))}
        </SortableContext>
        {agendamentos.length === 0 && (
            <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center opacity-50"><span className="text-xs">Vazio</span></div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ agendamentos, onStatusChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );
  const [activeId, setActiveId] = useState(null);
  const activeAgendamento = useMemo(() => agendamentos.find(a => a.id === activeId), [activeId, agendamentos]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) { setActiveId(null); return; }
    
    const overId = over.id;
    let novoStatus = COLUNAS.some(c => c.id === overId) ? overId : agendamentos.find(a => a.id === overId)?.status;

    if (novoStatus && agendamentos.find(a => a.id === active.id)?.status !== novoStatus) {
        onStatusChange(active.id, novoStatus);
    }
    setActiveId(null);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
      {/* MUDANÇA CRÍTICA: w-full e max-w-full para conter o scroll horizontal na div e não na página */}
      <div className="flex gap-3 h-full overflow-x-auto pb-4 items-stretch px-1 snap-x snap-mandatory scroll-smooth w-full max-w-full">
        {COLUNAS.map((col) => (
          <KanbanColumn key={col.id} col={col} agendamentos={agendamentos.filter(a => a.status === col.id)} />
        ))}
      </div>
      <DragOverlay>{activeId && activeAgendamento ? <KanbanCard agendamento={activeAgendamento} isOverlay /> : null}</DragOverlay>
    </DndContext>
  );
}