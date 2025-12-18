// src/pages/Agenda.jsx
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
import { Loader2, Plus, Calendar as CalendarIcon } from 'lucide-react';

export default function Agenda() {
  const { user, userData } = useAuth();
  const { showToast } = useToast();

  const [eventos, setEventos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [dadosModal, setDadosModal] = useState(null);

  const idDaClinica = userData?.clinicaId;

  // Carregar dados da Firebase
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
        borderColor: getCorStatus(evt.status),
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
      case 'confirmado': return '#10b981';
      case 'realizado': return '#64748b';
      case 'faltou': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  // Verificação de Conflitos de Horário
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

  // Handler para arrastar e soltar (Drag & Drop)
  const handleEventDrop = async (info) => {
    const { event } = info;
    const novoStart = event.start;
    const novoEnd = event.end || addHours(novoStart, 1);

    if (verificarConflito(novoStart, novoEnd, event.id)) {
      showToast({ message: "Conflito de horário! Reagendamento cancelado.", type: "error" });
      info.revert();
      return;
    }

    try {
      await agendaService.atualizar(event.id, {
        start: novoStart.toISOString(),
        end: novoEnd.toISOString(),
        userId: idDaClinica
      });
      showToast({ message: "Horário atualizado com sucesso!", type: "success" });
    } catch (error) {
      info.revert();
      showToast({ message: "Erro ao atualizar agendamento.", type: "error" });
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
        userId: idDaClinica
      };

      if (dados.id) {
        await agendaService.atualizar(dados.id, payload);
      } else {
        await agendaService.criar(payload);
      }
      
      setModalOpen(false);
      carregarDados();
      showToast({ message: "Guardado!", type: "success" });
    } catch (error) {
      showToast({ message: "Erro ao guardar.", type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-blue-600" /> Agenda Semanal
          </h1>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"
          >
            <Plus size={20}/> Novo Agendamento
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40}/></div>
        ) : (
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
            <FullCalendar
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              locale={ptBrLocale}
              events={eventos}
              editable={true}
              selectable={true}
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              height="auto"
              eventClick={(info) => {
                 const evt = info.event.extendedProps;
                 setDadosModal({
                   ...evt,
                   id: info.event.id,
                   data: format(parseISO(evt.start), 'yyyy-MM-dd'),
                   hora: format(parseISO(evt.start), 'HH:mm')
                 });
                 setModalOpen(true);
              }}
              eventDrop={handleEventDrop}
            />
          </div>
        )}
      </div>

      <ModalAgendamento 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={handleSalvar}
        dadosIniciais={dadosModal}
        listaPacientes={pacientes}
      />
    </div>
  );
}