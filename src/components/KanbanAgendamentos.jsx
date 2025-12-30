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
import { Clock, User, CheckCircle2, AlertCircle, Stethoscope, Armchair } from 'lucide-react';

// --- CONFIGURAÇÃO DAS COLUNAS (FLUXO DA CLÍNICA) ---
const COLUNAS = [
  { 
    id: 'agendado', 
    titulo: 'Agendado', 
    cor: 'bg-slate-50 border-slate-200', 
    icone: <Clock size={16} className="text-slate-500"/> 
  },
  { 
    id: 'confirmado', // Representa "Na Recepção" ou "Confirmado"
    titulo: 'Na Recepção', 
    cor: 'bg-yellow-50/80 border-yellow-200', 
    icone: <Armchair size={16} className="text-yellow-600"/> 
  },
  { 
    id: 'em_atendimento', 
    titulo: 'Em Atendimento', 
    cor: 'bg-blue-50/80 border-blue-200', 
    icone: <Stethoscope size={16} className="text-blue-600"/> 
  },
  { 
    id: 'realizado', 
    titulo: 'Finalizado', 
    cor: 'bg-emerald-50/80 border-emerald-200', 
    icone: <CheckCircle2 size={16} className="text-emerald-600"/> 
  }
];

// --- SUB-COMPONENTE: CARTÃO DO PACIENTE ---
function KanbanCard({ agendamento, isOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: agendamento.id,
    data: { ...agendamento }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Visual do Card quando está sendo arrastado (flutuando)
  if (isOverlay) {
    return (
        <div className="bg-white p-3 rounded-xl shadow-2xl border-2 border-emerald-500 cursor-grabbing w-full rotate-2 scale-105">
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-800">{agendamento.pacienteNome || 'Paciente'}</span>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                    {agendamento.hora}
                </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
                <Stethoscope size={12}/> {agendamento.medicoNome}
            </div>
        </div>
    );
  }

  // Visual do Card normal na coluna
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-emerald-300 cursor-grab active:cursor-grabbing group mb-3 transition-all"
    >
      <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h4 className="font-bold text-sm text-slate-700 group-hover:text-emerald-700 transition-colors">
                {agendamento.pacienteNome || 'Sem nome'}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                {agendamento.tipo || 'Consulta'}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
             {agendamento.hora}
          </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
         <div className="flex items-center gap-2 text-xs text-slate-500">
             <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                 {agendamento.medicoNome ? agendamento.medicoNome.substring(0,1) : 'M'}
             </div>
             <span className="truncate max-w-[100px]">{agendamento.medicoNome || 'Sem médico'}</span>
         </div>
         {agendamento.valor > 0 && (
             <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                R$ {agendamento.valor}
             </span>
         )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE: COLUNA ---
function KanbanColumn({ col, agendamentos }) {
  const { setNodeRef } = useSortable({ id: col.id });

  return (
    <div ref={setNodeRef} className={`flex-1 min-w-[280px] flex flex-col h-full rounded-2xl border ${col.cor} p-2 transition-colors`}>
      {/* Cabeçalho da Coluna */}
      <div className="flex items-center justify-between p-2 mb-2">
         <div className="flex items-center gap-2">
            {col.icone}
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                {col.titulo}
            </h3>
         </div>
         <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">
            {agendamentos.length}
         </span>
      </div>

      {/* Área Droppable */}
      <div className="flex-1 overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <SortableContext items={agendamentos.map(a => a.id)} strategy={verticalListSortingStrategy}>
            {agendamentos.map((ag) => (
                <KanbanCard key={ag.id} agendamento={ag} />
            ))}
        </SortableContext>
        
        {agendamentos.length === 0 && (
            <div className="h-32 border-2 border-dashed border-slate-300/30 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="opacity-20">{col.icone}</div>
                <span className="text-xs italic opacity-50">Vazio</span>
            </div>
        )}
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function KanbanBoard({ agendamentos, onStatusChange }) {
  // Sensores para detectar clique vs arraste (Mouse e Touch)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor)
  );

  const [activeId, setActiveId] = useState(null);

  // Memoiza o card ativo para performance
  const activeAgendamento = useMemo(() => {
     return agendamentos.find(a => a.id === activeId);
  }, [activeId, agendamentos]);

  // Função disparada ao soltar o card
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) {
        setActiveId(null);
        return;
    }

    const agendamentoId = active.id;
    const overId = over.id;

    // Lógica para descobrir qual é o novo status
    let novoStatus = null;

    // Cenário 1: Soltou diretamente sobre uma coluna vazia ou na área da coluna
    if (COLUNAS.some(c => c.id === overId)) {
        novoStatus = overId;
    } else {
        // Cenário 2: Soltou sobre outro card (pega o status do card de baixo)
        const cardOndeSoltou = agendamentos.find(a => a.id === overId);
        if (cardOndeSoltou) {
            novoStatus = cardOndeSoltou.status;
        }
    }

    // Se achou um status novo e ele é diferente do atual, chama a função do pai
    const cardArrastado = agendamentos.find(a => a.id === agendamentoId);
    if (cardArrastado && novoStatus && cardArrastado.status !== novoStatus) {
        onStatusChange(agendamentoId, novoStatus);
    }

    setActiveId(null);
  };

  const handleDragStart = (event) => setActiveId(event.active.id);

  return (
    <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4 items-stretch px-2">
        {COLUNAS.map((col) => (
          <KanbanColumn 
            key={col.id} 
            col={col} 
            // Filtra apenas os agendamentos desta coluna
            agendamentos={agendamentos.filter(a => a.status === col.id)} 
          />
        ))}
      </div>

      {/* Camada Visual (O que segue o mouse) */}
      <DragOverlay>
        {activeId && activeAgendamento ? (
            <KanbanCard agendamento={activeAgendamento} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}