// src/components/MobileDayView.jsx
import React from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { getCorStatus, getStatusBadge } from '../utils/agendaUtils';

const MobileDayView = ({ 
  selectedDate, 
  setSelectedDate, 
  navegarDia, 
  eventosDoDia, 
  onEventClick 
}) => {
  return (
    <div className="lg:hidden bg-white rounded-2xl shadow-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navegarDia(-1)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h3 className="font-bold text-xl text-slate-800">{format(selectedDate, 'dd/MM')}</h3>
            <p className="text-sm text-slate-500">{format(selectedDate, 'EEEE')}</p>
          </div>
          <button onClick={() => navegarDia(1)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200">
            <ChevronRight size={20} />
          </button>
        </div>
        <button onClick={() => setSelectedDate(new Date())} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">
          Hoje
        </button>
      </div>

      {eventosDoDia.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
            <CalendarIcon className="text-blue-400" size={24} />
          </div>
          <p className="text-slate-500 font-medium">Nenhum agendamento para hoje</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {eventosDoDia
            .sort((a, b) => parseISO(a.start) - parseISO(b.start))
            .map(evento => {
              const status = getStatusBadge(evento.extendedProps.status);
              const horaInicio = format(parseISO(evento.start), 'HH:mm');
              
              return (
                <div 
                  key={evento.id}
                  onClick={() => onEventClick(evento)}
                  className="p-4 rounded-xl border-l-4 border-l-blue-500 bg-slate-50 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                  style={{ borderLeftColor: getCorStatus(evento.extendedProps.status) }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      <span className="font-bold text-slate-800">{horaInicio}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <h4 className="font-bold text-lg text-slate-900 mb-1">{evento.title}</h4>
                  {evento.extendedProps.medicoNome && (
                    <p className="text-xs text-blue-600 font-medium">Dr(a). {evento.extendedProps.medicoNome}</p>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default MobileDayView;