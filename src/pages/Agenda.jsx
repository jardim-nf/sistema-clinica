// src/pages/Agenda.jsx - Correção Nome do Médico no Plantão
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { agendaService } from '../services/agendaService';
import { pacienteService } from '../services/pacienteService';
import { medicoService } from '../services/medicoService';

// COMPONENTES
import ModalAgendamento from '../components/ModalAgendamento';
import MobileDayView from '../components/MobileDayView'; 
import KanbanView from '../components/KanbanView'; 
import { getCorStatus } from '../utils/agendaUtils'; 

import { format, parseISO, addHours, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Loader2, Plus, Calendar as CalendarIcon, 
  Columns, Filter, Users 
} from 'lucide-react';

export default function Agenda() {
  const { userData } = useAuth();
  const { showToast } = useToast();

  const [eventos, setEventos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Modais e Visualização
  const [modalOpen, setModalOpen] = useState(false);
  const [dadosModal, setDadosModal] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); 
  const [calendarView, setCalendarView] = useState('week');

  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isMedico = userData?.role === 'medico';
  const [medicoFiltro, setMedicoFiltro] = useState(isMedico ? (userData.medicoId || '') : '');

  const idDaClinica = userData?.clinicaId || userData?.id;

  // --- CARREGAMENTO DE DADOS ---
  const carregarDados = useCallback(async () => {
    if (!idDaClinica) return;
    setLoading(true);
    try {
      const [listaAgenda, listaPacientes, listaMedicos] = await Promise.all([
        agendaService.listar(idDaClinica),
        pacienteService.listar(idDaClinica),
        medicoService.listar(idDaClinica)
      ]);

      const eventosFormatados = listaAgenda.map(evt => ({
        id: evt.id,
        title: evt.pacienteNome || 'Sem Nome',
        start: evt.start,
        end: evt.end,
        extendedProps: { ...evt }, 
        backgroundColor: getCorStatus(evt.status),
        borderColor: 'transparent',
        className: 'cursor-pointer hover:brightness-95 transition-all shadow-sm rounded-lg border-l-4',
      }));

      setEventos(eventosFormatados);
      setPacientes(listaPacientes);
      setMedicos(listaMedicos);
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar dados.", "error");
    } finally {
      setLoading(false);
    }
  }, [idDaClinica, showToast]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCalendarView('day');
      } else {
        setCalendarView('week');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- LÓGICA DE FILTRAGEM ---
  const eventosFiltrados = useMemo(() => {
    if (!medicoFiltro) return eventos;
    return eventos.filter(evt => evt.extendedProps.medicoId === medicoFiltro);
  }, [eventos, medicoFiltro]);

  const eventosDoDia = eventosFiltrados.filter(evento => {
    const dataEvento = format(parseISO(evento.start), 'yyyy-MM-dd');
    const dataSelecionada = format(selectedDate, 'yyyy-MM-dd');
    return dataEvento === dataSelecionada;
  });

  // --- PLANTÃO (QUEM TRABALHA HOJE) ---
  const medicosDoDiaSelecionado = useMemo(() => {
     const dataString = format(selectedDate, 'yyyy-MM-dd');
     const dataSegura = new Date(`${dataString}T12:00:00`);
     const diaSemana = dataSegura.getDay(); 

     return medicos.filter(m => {
        if (!m.diasAtendimento || !Array.isArray(m.diasAtendimento) || m.diasAtendimento.length === 0) {
            return true;
        }
        return m.diasAtendimento.includes(diaSemana);
     });
  }, [medicos, selectedDate]);

  // --- VALIDAÇÕES ---
  const verificarConflito = (start, end, idIgnorar = null) => {
    return eventos.some(evt => {
      if (idIgnorar && evt.id === idIgnorar) return false;
      if (medicoFiltro && evt.extendedProps.medicoId !== medicoFiltro) return false;

      const s = parseISO(evt.start);
      const e = parseISO(evt.end);
      return (
        isWithinInterval(start, { start: s, end: e }) ||
        isWithinInterval(end, { start: s, end: e }) ||
        (start <= s && end >= e)
      );
    });
  };

  // --- HANDLERS ---
  const handleSelectSlot = (info) => {
    setDadosModal({
      data: format(info.start, 'yyyy-MM-dd'),
      hora: format(info.start, 'HH:mm'),
      pacienteId: '',
      medicoId: medicoFiltro || '', 
      status: 'agendado'
    });
    setModalOpen(true);
  };

  const handleEventDrop = async (info) => {
    const { event } = info;
    const novoStart = event.start;
    const novoEnd = event.end || addHours(novoStart, 1);

    if (verificarConflito(novoStart, novoEnd, event.id)) {
      showToast("Conflito de horário detectado.", "error");
      info.revert();
      return;
    }

    try {
      await agendaService.atualizar(event.id, {
        start: novoStart.toISOString(),
        end: novoEnd.toISOString()
      });
      showToast("Reagendado!", "success");
    } catch (error) {
      info.revert();
      showToast("Erro ao atualizar.", "error");
    }
  };

  const handleKanbanStatusChange = async (id, novoStatus) => {
    const eventosAntigos = [...eventos];
    setEventos(prev => prev.map(evt => 
      evt.id === id ? { ...evt, extendedProps: { ...evt.extendedProps, status: novoStatus }, backgroundColor: getCorStatus(novoStatus) } : evt
    ));

    try {
      await agendaService.atualizar(id, { status: novoStatus });
    } catch (error) {
      setEventos(eventosAntigos);
      showToast("Erro ao mover card.", "error");
    }
  };

  const handleSalvar = async (dados) => {
    const usuarioId = userData?.id || userData?.uid || userData?.clinicaId;
    if (!usuarioId) return alert("Erro de sessão.");

    const start = new Date(`${dados.data}T${dados.hora}:00`);
    const end = addHours(start, 1);

    const conflito = eventos.some(evt => {
        if (evt.id === dados.id) return false;
        if (evt.extendedProps.medicoId !== dados.medicoId) return false; 
        const s = parseISO(evt.start);
        const e = parseISO(evt.end);
        return (isWithinInterval(start, { start: s, end: e }) || (start <= s && end >= e));
    });

    if (conflito) return alert("Este horário já está ocupado para este médico."); 

    try {
      const pac = pacientes.find(p => p.id === dados.pacienteId);
      const med = medicos.find(m => m.id === dados.medicoId);
      
      const payload = {
        ...dados,
        pacienteNome: pac?.nome || 'Paciente Avulso',
        medicoNome: med?.nome || 'Médico',
        start: start.toISOString(),
        end: end.toISOString(),
        clinicaId: idDaClinica,
        userId: usuarioId, 
        donoId: usuarioId,
        updatedAt: new Date().toISOString()
      };

      if (dados.id) await agendaService.atualizar(dados.id, payload);
      else await agendaService.criar(payload);
      
      setModalOpen(false);
      setDadosModal(null);
      carregarDados();
      showToast("Salvo com sucesso!", "success");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir agendamento?")) return;
    try {
      await agendaService.excluir(id);
      showToast("Excluído!", "success");
      setModalOpen(false);
      setDadosModal(null);
      carregarDados(); 
    } catch (error) {
      showToast("Erro ao excluir.", "error");
    }
  };

  const navegarDia = (direcao) => {
    const novoDia = new Date(selectedDate);
    novoDia.setDate(novoDia.getDate() + direcao);
    setSelectedDate(novoDia);
  };

  const kanbanData = useMemo(() => {
    return eventosDoDia.map(evt => ({
      id: evt.id,
      pacienteNome: evt.title,
      medicoNome: evt.extendedProps.medicoNome,
      hora: format(parseISO(evt.start), 'HH:mm'),
      status: evt.extendedProps.status || 'agendado',
      tipo: evt.extendedProps.tipo,
      valor: evt.extendedProps.valor
    }));
  }, [eventosDoDia]);

  const abrirModalEvento = (evento) => {
      setDadosModal({
        ...evento.extendedProps,
        id: evento.id,
        data: format(parseISO(evento.start), 'yyyy-MM-dd'),
        hora: format(parseISO(evento.start), 'HH:mm')
      });
      setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-8">
      <style>{`
        .fc .fc-toolbar-title { font-size: 1rem !important; font-weight: 700; color: #1e293b; text-transform: capitalize; }
        @media (min-width: 768px) { .fc .fc-toolbar-title { font-size: 1.25rem !important; } }
        .fc .fc-button-primary { background-color: #fff !important; border-color: #e2e8f0 !important; color: #64748b !important; font-weight: 600; border-radius: 12px !important; padding: 8px 12px !important; }
        .fc .fc-button-primary:hover { background-color: #f8fafc !important; }
        .fc .fc-button-active { background-color: #10b981 !important; border-color: #10b981 !important; color: #fff !important; }
        .fc .fc-timegrid-slot { height: 50px !important; border-bottom: 1px solid #f1f5f9 !important; }
        .fc-event { border-radius: 8px !important; padding: 2px 4px !important; border: none !important; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-2xl shadow-blue-200 shadow-lg text-white"><CalendarIcon size={20} /></div>
                  Agenda
                </h1>
             </div>
             
             {/* Filtro de Médicos (Oculto se for Médico logado) */}
             {!isMedico && (
               <div className="flex items-center bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                  <div className="px-3 text-slate-400"><Filter size={18} /></div>
                  <select 
                      value={medicoFiltro} 
                      onChange={(e) => setMedicoFiltro(e.target.value)}
                      className="bg-transparent outline-none text-slate-700 text-sm font-bold w-full sm:w-64 py-2"
                  >
                      <option value="">Todos os Médicos</option>
                      {medicos.map(medico => (
                          <option key={medico.id} value={medico.id}>{medico.nome}</option>
                      ))}
                  </select>
                  {medicoFiltro && (
                      <button onClick={() => setMedicoFiltro('')} className="px-2 text-slate-400 hover:text-red-500">
                          <span className="text-xs font-bold">Limpar</span>
                      </button>
                  )}
               </div>
             )}

             <div className="hidden md:flex bg-slate-200 p-1 rounded-xl">
                <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                   <CalendarIcon size={16} /> Calendário
                </button>
                <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                   <Columns size={16} /> Fluxo (Kanban)
                </button>
             </div>
          </div>

          {/* BARRA DE PLANTÃO - CORRIGIDA */}
          <div className="bg-white/60 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center gap-2">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                   <Users size={14}/> 
                   Plantão {format(selectedDate, 'EEEE', { locale: ptBR })}:
               </span>
               {medicosDoDiaSelecionado.length > 0 ? (
                   medicosDoDiaSelecionado.map(med => (
                       <div key={med.id} className="bg-white border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                           <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                           {/* AQUI ESTAVA O PROBLEMA: REMOVI O .split(' ')[0] */}
                           <span className="text-xs font-bold text-slate-700">{med.nome}</span>
                           <span className="text-[10px] text-slate-400 uppercase font-medium">{med.especialidade}</span>
                       </div>
                   ))
               ) : (
                   <span className="text-xs text-slate-400 italic">Nenhum médico configurado para este dia.</span>
               )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto md:hidden">
            <button onClick={() => setMobileListOpen(!mobileListOpen)} className="lg:hidden flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              {mobileListOpen ? 'Ver Calendário' : 'Ver Lista'}
            </button>
            <button onClick={() => { setDadosModal({ data: format(new Date(), 'yyyy-MM-dd'), hora: format(new Date(), 'HH:mm'), pacienteId: '', medicoId: medicoFiltro || '', status: 'agendado' }); setModalOpen(true); }} className="flex-1 sm:flex-none bg-blue-600 text-white text-sm sm:text-base py-3 rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
              <Plus size={20}/> <span className="hidden sm:inline">{isMedico ? 'Novo Horário' : 'Novo Agendamento'}</span><span className="sm:hidden">Novo</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-blue-600" size={48}/></div>
        ) : (
          <>
            {window.innerWidth < 1024 && mobileListOpen && (
              <MobileDayView selectedDate={selectedDate} setSelectedDate={setSelectedDate} navegarDia={navegarDia} eventosDoDia={eventosDoDia} onEventClick={abrirModalEvento} />
            )}
            <div className={`${window.innerWidth < 1024 && mobileListOpen ? 'hidden' : 'block'}`}>
              {viewMode === 'calendar' && (
                <div className="bg-white p-4 md:p-6 rounded-[24px] sm:rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in duration-300">
                  <FullCalendar
                    plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                    initialView={calendarView === 'day' ? 'timeGridDay' : calendarView === 'week' ? 'timeGridWeek' : 'dayGridMonth'}
                    locale={ptBrLocale}
                    events={eventosFiltrados}
                    editable={window.innerWidth >= 768}
                    selectable={window.innerWidth >= 768}
                    selectMirror={true}
                    dayMaxEvents={3}
                    slotMinTime="07:00:00"
                    slotMaxTime="21:00:00"
                    allDaySlot={false}
                    height={window.innerWidth < 768 ? "500px" : "auto"}
                    nowIndicator={true}
                    select={handleSelectSlot}
                    datesSet={(arg) => {
                        const midDate = new Date((arg.start.getTime() + arg.end.getTime()) / 2);
                        setSelectedDate(midDate);
                    }}
                    eventClick={(info) => { const evt = info.event.extendedProps; abrirModalEvento({ id: info.event.id, start: info.event.startStr, extendedProps: evt }); }}
                    eventDrop={window.innerWidth >= 768 ? handleEventDrop : undefined}
                  />
                </div>
              )}
              {viewMode === 'kanban' && ( <KanbanView selectedDate={selectedDate} navegarDia={navegarDia} kanbanData={kanbanData} onStatusChange={handleKanbanStatusChange} /> )}
            </div>
          </>
        )}
      </div>

      <button onClick={() => { setDadosModal({ data: format(new Date(), 'yyyy-MM-dd'), hora: format(new Date(), 'HH:mm'), pacienteId: '', medicoId: medicoFiltro || '', status: 'agendado' }); setModalOpen(true); }} className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 text-white rounded-full shadow-2xl active:scale-90 transition-transform lg:hidden">
        <Plus size={24} />
      </button>

      <ModalAgendamento isOpen={modalOpen} onClose={() => { setModalOpen(false); setDadosModal(null); }} onSave={handleSalvar} onDelete={handleExcluir} dadosIniciais={dadosModal} listaPacientes={pacientes} listaMedicos={medicos} />
    </div>
  );
}