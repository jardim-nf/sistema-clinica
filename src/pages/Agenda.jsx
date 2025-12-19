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
import { 
  Loader2, Plus, Calendar as CalendarIcon, Filter, 
  ChevronLeft, ChevronRight, Menu, X, 
  Clock, User, Phone, AlertCircle
} from 'lucide-react';

export default function Agenda() {
  const { userData } = useAuth();
  const { showToast } = useToast();

  const [eventos, setEventos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [dadosModal, setDadosModal] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'day', 'week', 'month'
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
        className: 'cursor-pointer hover:brightness-95 transition-all shadow-sm rounded-lg border-l-4',
        mobileLabel: format(parseISO(evt.start), 'HH:mm')
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

  // Ajustar view mode baseado no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('day');
      } else if (window.innerWidth < 1024) {
        setViewMode('week');
      } else {
        setViewMode('week');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCorStatus = (status) => {
    switch (status) {
      case 'confirmado': return '#10b981';
      case 'realizado': return '#64748b';
      case 'faltou': return '#ef4444';
      case 'atrasado': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pendente: { label: 'Pendente', color: 'bg-blue-100 text-blue-800' },
      confirmado: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-800' },
      realizado: { label: 'Realizado', color: 'bg-slate-100 text-slate-800' },
      faltou: { label: 'Faltou', color: 'bg-red-100 text-red-800' },
      atrasado: { label: 'Atrasado', color: 'bg-amber-100 text-amber-800' }
    };
    return config[status] || config.pendente;
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

// Dentro de Agenda.jsx

const handleSalvar = async (dados) => {
    // 1. DEBUG: Vamos ver o que tem no userData no console
    console.log("=== DEBUG SALVAR ===");
    console.log("UserData completo:", userData);

    // Tenta pegar o ID de várias formas possíveis (Firebase usa uid, SQL usa id, etc)
    const usuarioId = userData?.id || userData?.uid || userData?.clinicaId;

    if (!usuarioId) {
      console.error("ERRO CRÍTICO: Usuário não identificado no contexto.");
      alert("Erro: Não foi possível identificar o usuário logado. Faça login novamente.");
      return;
    }

    const start = new Date(`${dados.data}T${dados.hora}:00`);
    const end = addHours(start, 1);

    if (verificarConflito(start, end, dados.id)) {
      alert("Este horário já está ocupado."); // Fallback simples
      return;
    }

    try {
      const pac = pacientes.find(p => p.id === dados.pacienteId);
      
      const payload = {
        ...dados,
        pacienteNome: pac?.nome || 'Paciente Avulso',
        start: start.toISOString(),
        end: end.toISOString(),
        clinicaId: idDaClinica,
        // ENVIANDO O ID COM OS DOIS NOMES PARA GARANTIR
        userId: usuarioId, 
        donoId: usuarioId,
        updatedAt: new Date().toISOString()
      };

      console.log("Payload sendo enviado:", payload); // Debug do envio

      if (dados.id) await agendaService.atualizar(dados.id, payload);
      else await agendaService.criar(payload);
      
      setModalOpen(false);
      setDadosModal(null);
      carregarDados();
      
      // Tenta usar o Toast, se falhar usa alert
      if (typeof showToast === 'function') {
        showToast({ message: "Salvo com sucesso!", type: "success" });
      } else {
        // Fallback temporário até arrumarmos o Context
        // alert("Agendamento salvo com sucesso!"); 
      }

    } catch (error) {
      console.error("Erro no catch:", error);
      alert("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    }
  };

  // Função para navegar entre dias
  const navegarDia = (direcao) => {
    const novoDia = new Date(selectedDate);
    novoDia.setDate(novoDia.getDate() + direcao);
    setSelectedDate(novoDia);
  };

  // Filtrar eventos para o dia selecionado (mobile)
  const eventosDoDia = eventos.filter(evento => {
    const dataEvento = format(parseISO(evento.start), 'yyyy-MM-dd');
    const dataSelecionada = format(selectedDate, 'yyyy-MM-dd');
    return dataEvento === dataSelecionada;
  });

  // Componente de lista mobile
  const MobileDayView = () => (
    <div className="lg:hidden bg-white rounded-2xl shadow-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navegarDia(-1)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h3 className="font-bold text-xl text-slate-800">
              {format(selectedDate, 'dd/MM')}
            </h3>
            <p className="text-sm text-slate-500">
              {format(selectedDate, 'EEEE')}
            </p>
          </div>
          <button 
            onClick={() => navegarDia(1)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <button 
          onClick={() => setSelectedDate(new Date())}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
        >
          Hoje
        </button>
      </div>

      {eventosDoDia.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
            <CalendarIcon className="text-blue-400" size={24} />
          </div>
          <p className="text-slate-500 font-medium">
            Nenhum agendamento para hoje
          </p>
          <button 
            onClick={() => {
              setDadosModal({
                data: format(selectedDate, 'yyyy-MM-dd'),
                hora: '09:00',
                pacienteId: '',
                status: 'pendente'
              });
              setModalOpen(true);
            }}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold"
          >
            Agendar
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {eventosDoDia
            .sort((a, b) => parseISO(a.start) - parseISO(b.start))
            .map(evento => {
              const status = getStatusBadge(evento.extendedProps.status);
              const horaInicio = format(parseISO(evento.start), 'HH:mm');
              const horaFim = format(parseISO(evento.end), 'HH:mm');
              
              return (
                <div 
                  key={evento.id}
                  onClick={() => {
                    setDadosModal({
                      ...evento.extendedProps,
                      id: evento.id,
                      data: format(parseISO(evento.start), 'yyyy-MM-dd'),
                      hora: format(parseISO(evento.start), 'HH:mm')
                    });
                    setModalOpen(true);
                  }}
                  className="p-4 rounded-xl border-l-4 border-l-blue-500 bg-slate-50 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                  style={{ borderLeftColor: getCorStatus(evento.extendedProps.status) }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      <span className="font-bold text-slate-800">
                        {horaInicio} - {horaFim}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-lg text-slate-900 mb-1">
                    {evento.title}
                  </h4>
                  
                  {evento.extendedProps.observacoes && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {evento.extendedProps.observacoes}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                    {evento.extendedProps.telefone && (
                      <div className="flex items-center gap-1">
                        <Phone size={14} />
                        <span>{evento.extendedProps.telefone}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-8">
      <style>{`
        .fc .fc-toolbar-title { 
          font-size: 1rem !important; 
          font-weight: 700; 
          color: #1e293b; 
          text-transform: capitalize; 
        }
        @media (min-width: 768px) {
          .fc .fc-toolbar-title { font-size: 1.25rem !important; }
        }
        .fc .fc-button-primary { 
          background-color: #fff !important; 
          border-color: #e2e8f0 !important; 
          color: #64748b !important; 
          font-weight: 600; 
          text-transform: capitalize; 
          border-radius: 12px !important; 
          padding: 8px 12px !important;
          font-size: 0.875rem !important;
        }
        .fc .fc-button-primary:hover { background-color: #f8fafc !important; }
        .fc .fc-button-active { 
          background-color: #3b82f6 !important; 
          border-color: #3b82f6 !important; 
          color: #fff !important; 
        }
        .fc .fc-timegrid-slot { height: 50px !important; border-bottom: 1px solid #f1f5f9 !important; }
        .fc-event { border-radius: 8px !important; padding: 2px 4px !important; }
        .fc-event-title { font-size: 0.75rem; font-weight: 600; }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .fc .fc-header-toolbar { 
            flex-direction: column; 
            gap: 1rem; 
            padding: 0.5rem;
          }
          .fc .fc-toolbar-chunk { 
            display: flex; 
            flex-wrap: wrap; 
            justify-content: center; 
            gap: 0.5rem;
          }
          .fc .fc-button { 
            padding: 6px 10px !important; 
            font-size: 0.75rem !important; 
          }
          .fc .fc-timegrid-slot { height: 40px !important; }
          .fc-event { padding: 1px 2px !important; }
          .fc-event-title { font-size: 0.65rem; }
        }
        
        /* Hide fullcalendar on mobile, show custom view */
        .mobile-calendar { display: none; }
        @media (min-width: 1024px) {
          .mobile-calendar { display: block; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-2xl shadow-blue-200 shadow-lg text-white">
                <CalendarIcon size={20} sm:size={24} />
              </div>
              Agenda
            </h1>
            <p className="text-slate-500 mt-1 ml-14 text-sm sm:text-base hidden sm:block">
              Gerencie seus atendimentos e horários.
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {/* Botão de alternar visualização mobile */}
            <button 
              onClick={() => setMobileListOpen(!mobileListOpen)}
              className="lg:hidden flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {mobileListOpen ? 'Ver Calendário' : 'Ver Lista'}
            </button>
            
            <button 
              onClick={() => {
                setDadosModal(null);
                setModalOpen(true);
              }}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              <Plus size={18} sm:size={20}/> 
              <span className="hidden sm:inline">Novo Agendamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </header>

        {/* Controles de visualização mobile */}
        <div className="lg:hidden mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button 
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg font-bold ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
            >
              Dia
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg font-bold ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
            >
              Semana
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg font-bold ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
            >
              Mês
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48}/>
            <p className="text-slate-400 font-medium italic">Sincronizando agenda...</p>
          </div>
        ) : (
          <>
            {/* Vista Mobile (Lista) */}
            {window.innerWidth < 1024 && mobileListOpen && <MobileDayView />}

            {/* Vista Calendário (Mobile & Desktop) */}
            <div className={`${window.innerWidth < 1024 && mobileListOpen ? 'hidden' : 'block'}`}>
              <div className="bg-white p-4 md:p-6 rounded-[24px] sm:rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100">
                <FullCalendar
                  plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                  initialView={viewMode === 'day' ? 'timeGridDay' : viewMode === 'week' ? 'timeGridWeek' : 'dayGridMonth'}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: window.innerWidth < 768 ? '' : 'dayGridMonth,timeGridWeek,timeGridDay'
                  }}
                  locale={ptBrLocale}
                  events={eventos}
                  editable={window.innerWidth >= 768} // Só permite arrastar em desktop
                  selectable={window.innerWidth >= 768} // Só permite selecionar em desktop
                  selectMirror={true}
                  dayMaxEvents={3}
                  slotMinTime="07:00:00"
                  slotMaxTime="21:00:00"
                  allDaySlot={false}
                  height={window.innerWidth < 768 ? "500px" : "auto"}
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
                  eventDrop={window.innerWidth >= 768 ? handleEventDrop : undefined}
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                  }}
                  slotLabelFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                  }}
                />
              </div>
            </div>

            {/* Informações rápidas mobile */}
            {window.innerWidth < 1024 && !mobileListOpen && (
              <div className="mt-4 bg-white p-4 rounded-2xl shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800">Hoje</h3>
                  <span className="text-sm text-blue-600 font-bold">
                    {format(new Date(), 'dd/MM')}
                  </span>
                </div>
                <div className="space-y-2">
                  {eventosDoDia.slice(0, 3).map(evento => (
                    <div key={evento.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      <div 
                        className="w-2 h-8 rounded"
                        style={{ backgroundColor: getCorStatus(evento.extendedProps.status) }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{evento.title}</p>
                        <p className="text-sm text-slate-500">
                          {format(parseISO(evento.start), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {eventosDoDia.length > 3 && (
                    <button 
                      onClick={() => setMobileListOpen(true)}
                      className="text-center w-full py-2 text-blue-600 font-bold"
                    >
                      Ver mais {eventosDoDia.length - 3} agendamentos
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Botão flutuante para mobile */}
      <button 
        onClick={() => { 
          setDadosModal({
            data: format(new Date(), 'yyyy-MM-dd'),
            hora: format(new Date(), 'HH:mm'),
            pacienteId: '',
            status: 'pendente'
          }); 
          setModalOpen(true); 
        }}
        className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 text-white rounded-full shadow-2xl active:scale-90 transition-transform lg:hidden"
      >
        <Plus size={24} />
      </button>

      <ModalAgendamento 
        isOpen={modalOpen} 
        onClose={() => { setModalOpen(false); setDadosModal(null); }} 
        onSave={handleSalvar}
        dadosIniciais={dadosModal}
        listaPacientes={pacientes}
        isMobile={window.innerWidth < 768}
      />
    </div>
  );
}