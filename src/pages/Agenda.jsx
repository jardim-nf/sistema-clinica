import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { agendaService } from '../services/agendaService';
import { pacienteService } from '../services/pacienteService';
import ModalAgendamento from '../components/ModalAgendamento';

import { format, parseISO, addHours, isWithinInterval } from 'date-fns';
import { Loader2, Plus, Calendar as CalendarIcon, Filter } from 'lucide-react';

export default function Agenda() {
  const { userData } = useAuth();
  const { showToast } = useToast();

  const [eventos, setEventos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [dadosModal, setDadosModal] = useState(null);

  const idDaClinica = userData?.clinicaId || userData?.id;

  const carregarDados = useCallback(async () => {
    if (!idDaClinica) return;
    setLoading(true);
    try {
      const [listaAgenda, listaPacientes] = await Promise.all([
        agendaService.listar(idDaClinica),
        pacienteService.listar(idDaClinica)
      ]);

      const eventosFormatados = listaAgenda.map(evt => ({
        id: evt.id,
        title: evt.pacienteNome || 'Sem Nome',
        start: evt.start,
        end: evt.end,
        extendedProps: { ...evt },
        backgroundColor: getCorStatus(evt.status),
        borderColor: 'transparent',
        className: 'cursor-pointer hover:brightness-95 transition-all shadow-sm rounded-lg border-l-4'
      }));

      setEventos(eventosFormatados);
      setPacientes(listaPacientes);
    } catch (error) {
      showToast({ message: "Erro ao carregar dados.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [idDaClinica, showToast]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const getCorStatus = (status) => {
    switch (status) {
      case 'confirmado': return '#10b981'; // emerald-500
      case 'realizado': return '#64748b';  // slate-500
      case 'faltou': return '#ef4444';     // red-500
      case 'atrasado': return '#f59e0b';   // amber-500
      default: return '#3b82f6';           // blue-500
    }
  };

  const verificarConflito = (start, end, idIgnorar = null) => {
    return eventos.some(evt => {
      if (idIgnorar && evt.id === idIgnorar) return false;
      const s = parseISO(evt.start);
      const e = parseISO(evt.end);
      return (
        isWithinInterval(start, { start: s, end: e }) ||
        isWithinInterval(end, { start: s, end: e }) ||
        (start <= s && end >= e)
      );
    });
  };

  // Abre o modal ao selecionar um intervalo vazio no calendário
  const handleSelectSlot = (info) => {
    setDadosModal({
      data: format(info.start, 'yyyy-MM-dd'),
      hora: format(info.start, 'HH:mm'),
      pacienteId: '',
      status: 'pendente'
    });
    setModalOpen(true);
  };

  const handleEventDrop = async (info) => {
    const { event } = info;
    const novoStart = event.start;
    const novoEnd = event.end || addHours(novoStart, 1);

    if (verificarConflito(novoStart, novoEnd, event.id)) {
      showToast({ message: "Conflito de horário detectado.", type: "error" });
      info.revert();
      return;
    }

    try {
      await agendaService.atualizar(event.id, {
        start: novoStart.toISOString(),
        end: novoEnd.toISOString()
      });
      showToast({ message: "Reagendado!", type: "success" });
    } catch (error) {
      info.revert();
      showToast({ message: "Erro ao atualizar.", type: "error" });
    }
  };

  const handleSalvar = async (dados) => {
    const start = new Date(`${dados.data}T${dados.hora}:00`);
    const end = addHours(start, 1);

    if (verificarConflito(start, end, dados.id)) {
      showToast({ message: "Este horário já está ocupado.", type: "error" });
      return;
    }

    try {
      const pac = pacientes.find(p => p.id === dados.pacienteId);
      const payload = {
        ...dados,
        pacienteNome: pac?.nome || 'Paciente Avulso',
        start: start.toISOString(),
        end: end.toISOString(),
        clinicaId: idDaClinica
      };

      if (dados.id) await agendaService.atualizar(dados.id, payload);
      else await agendaService.criar(payload);
      
      setModalOpen(false);
      setDadosModal(null);
      carregarDados();
      showToast({ message: "Agenda atualizada!", type: "success" });
    } catch (error) {
      showToast({ message: "Erro ao salvar.", type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-8">
      <style>{`
        .fc .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 700; color: #1e293b; text-transform: capitalize; }
        .fc .fc-button-primary { background-color: #fff !important; border-color: #e2e8f0 !important; color: #64748b !important; font-weight: 600; text-transform: capitalize; border-radius: 12px !important; }
        .fc .fc-button-primary:hover { background-color: #f8fafc !important; }
        .fc .fc-button-active { background-color: #3b82f6 !important; border-color: #3b82f6 !important; color: #fff !important; }
        .fc .fc-timegrid-slot { height: 50px !important; border-bottom: 1px solid #f1f5f9 !important; }
        .fc-event { border-radius: 8px !important; padding: 2px 4px !important; }
        @media (max-width: 768px) {
          .fc .fc-header-toolbar { flex-direction: column; gap: 1rem; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-2xl shadow-blue-200 shadow-lg text-white">
                <CalendarIcon size={24} />
              </div>
              Agenda
            </h1>
            <p className="text-slate-500 mt-1 ml-14 hidden sm:block">Gerencie seus atendimentos e horários.</p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setModalOpen(true)}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              <Plus size={20}/> Novo Agendamento
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48}/>
            <p className="text-slate-400 font-medium italic">Sincronizando agenda...</p>
          </div>
        ) : (
          <div className="bg-white p-4 md:p-6 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in duration-500">
            <FullCalendar
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView={window.innerWidth < 768 ? "timeGridDay" : "timeGridWeek"}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              locale={ptBrLocale}
              events={eventos}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              slotMinTime="07:00:00"
              slotMaxTime="21:00:00"
              allDaySlot={false}
              height="auto"
              nowIndicator={true}
              select={handleSelectSlot}
              eventClick={(info) => {
                 const evt = info.event.extendedProps;
                 setDadosModal({
                   ...evt,
                   id: info.event.id,
                   data: format(parseISO(info.event.startStr), 'yyyy-MM-dd'),
                   hora: format(parseISO(info.event.startStr), 'HH:mm')
                 });
                 setModalOpen(true);
              }}
              eventDrop={handleEventDrop}
            />
          </div>
        )}
      </div>

      {/* Botão flutuante para mobile */}
      <button 
        onClick={() => { setDadosModal(null); setModalOpen(true); }}
        className="fixed bottom-6 right-6 lg:hidden p-4 bg-blue-600 text-white rounded-full shadow-2xl z-40 active:scale-90 transition-transform"
      >
        <Plus size={32} />
      </button>

      <ModalAgendamento 
        isOpen={modalOpen} 
        onClose={() => { setModalOpen(false); setDadosModal(null); }} 
        onSave={handleSalvar}
        dadosIniciais={dadosModal}
        listaPacientes={pacientes}
      />
    </div>
  );
}