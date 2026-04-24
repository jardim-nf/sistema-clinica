import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, User, Phone, CheckCircle, ChevronLeft } from 'lucide-react';
import { clinicaService } from '../services/clinicaService';
import { medicoService } from '../services/medicoService';
import { agendaService } from '../services/agendaService';
import { format, addDays, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AgendamentoOnline() {
    const { clinicaId } = useParams();
    const [clinica, setClinica] = useState(null);
    const [medicos, setMedicos] = useState([]);
    const [step, setStep] = useState(1);
    
    // Form state
    const [selectedEspecialidade, setSelectedEspecialidade] = useState('');
    const [selectedMedico, setSelectedMedico] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState('');
    const [pacienteData, setPacienteData] = useState({ nome: '', telefone: '', cpf: '' });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [agendamentosExistentes, setAgendamentosExistentes] = useState([]);

    useEffect(() => {
        async function loadData() {
            if (!clinicaId) return;
            try {
                const clinicaData = await clinicaService.getClinicaById(clinicaId);
                setClinica(clinicaData);
                
                const medicosData = await medicoService.listar(clinicaId);
                setMedicos(medicosData);

                const agendamentosData = await agendaService.listar(clinicaId);
                setAgendamentosExistentes(agendamentosData);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [clinicaId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!clinica) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800">Clínica não encontrada</h2>
                    <p className="text-slate-500 mt-2">Verifique o link acessado.</p>
                </div>
            </div>
        );
    }

    const especialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    const medicosFiltrados = selectedEspecialidade ? medicos.filter(m => m.especialidade === selectedEspecialidade) : medicos;

    // Gerar horários fictícios (Na vida real, cruzaríamos com agendaService.listar)
    const baseTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00'];
    
    const now = new Date();
    
    // Gerar próximos 14 dias para agendamento (ocultando hoje se não houver mais horários)
    const availableDates = Array.from({ length: 14 })
        .map((_, i) => addDays(startOfToday(), i))
        .filter(date => {
            const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            if (isToday) {
                // Verifica se tem algum horário no futuro para hoje
                return baseTimes.some(time => {
                    const [hours, minutes] = time.split(':').map(Number);
                    const timeObj = new Date();
                    timeObj.setHours(hours, minutes, 0, 0);
                    return timeObj > now;
                });
            }
            // Opcional: Remover domingos se a clínica não abrir (date.getDay() !== 0)
            return true;
        });
    
    const isSelectedDateToday = selectedDate && selectedDate.getDate() === now.getDate() && selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear();
    
    let times = isSelectedDateToday 
        ? baseTimes.filter(time => {
            const [hours, minutes] = time.split(':').map(Number);
            const timeObj = new Date();
            timeObj.setHours(hours, minutes, 0, 0);
            return timeObj > now;
        }) 
        : [...baseTimes];

    if (selectedMedico && selectedDate) {
        const dataStr = format(selectedDate, 'yyyy-MM-dd');
        const agendamentosDoDia = agendamentosExistentes.filter(ag => ag.medicoId === selectedMedico.id && ag.data === dataStr);
        
        times = times.filter(time => {
            const [tH, tM] = time.split(':').map(Number);
            const slotMin = tH * 60 + tM;

            for (const ag of agendamentosDoDia) {
                if (ag.hora) {
                    const [agH, agM] = ag.hora.split(':').map(Number);
                    const agMin = agH * 60 + agM;
                    // Se o slot cair dentro do período da consulta (considerando duração de 60 min)
                    if (slotMin >= agMin && slotMin < agMin + 60) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    const availableTimes = times;

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        
        let formattedValue = value;
        if (value.length > 2) {
            formattedValue = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        }
        if (value.length > 7) {
            formattedValue = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
        }
        setPacienteData({...pacienteData, telefone: formattedValue});
    };

    const handleCpfChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        
        let formattedValue = value;
        if (value.length > 3) {
            formattedValue = `${value.slice(0, 3)}.${value.slice(3)}`;
        }
        if (value.length > 6) {
            formattedValue = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
        }
        if (value.length > 9) {
            formattedValue = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
        }
        setPacienteData({...pacienteData, cpf: formattedValue});
    };

    const handleConfirmar = async () => {
        if (!selectedMedico || !selectedDate || !selectedTime || !pacienteData.nome || !pacienteData.telefone || !pacienteData.cpf) {
            alert('Preencha todos os campos, incluindo o CPF!');
            return;
        }

        setSubmitting(true);
        try {
            const dataStr = format(selectedDate, 'yyyy-MM-dd');
            const startObj = new Date(`${dataStr}T${selectedTime}:00`);
            const endObj = new Date(startObj.getTime() + 60 * 60 * 1000); // Adiciona 1 hora

            const agendamentoData = {
                userId: clinicaId,       // Importante para a query da Agenda
                donoId: clinicaId,       // Importante para compatibilidade
                clinicaId: clinicaId,    // Importante para compatibilidade
                medicoId: selectedMedico.id,
                medicoNome: selectedMedico.nome,
                pacienteNome: pacienteData.nome,
                telefone: pacienteData.telefone,
                cpf: pacienteData.cpf,
                data: dataStr,
                hora: selectedTime,
                start: startObj.toISOString(), // Essencial para o FullCalendar
                end: endObj.toISOString(),     // Essencial para o FullCalendar
                status: 'agendado',
                origem: 'online',
                createdAt: new Date().toISOString()
            };

            await agendaService.criar(agendamentoData);
            setSuccess(true);
        } catch (error) {
            console.error(error);
            alert('Erro ao agendar consulta. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Agendamento Confirmado!</h2>
                    <p className="text-slate-600 mb-6">
                        Sua consulta com <strong>Dr(a). {selectedMedico?.nome}</strong> foi marcada para <strong>{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}</strong>.
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Fazer Novo Agendamento
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header Clínica */}
                <div className="bg-blue-600 p-6 text-white text-center">
                    {clinica?.logo && (
                        <img src={clinica.logo} alt="Logo" className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white mb-3" />
                    )}
                    <h1 className="text-2xl font-bold">{clinica?.nome_fantasia || 'Clínica Parceira'}</h1>
                    <p className="text-blue-100 mt-1">Agendamento Online</p>
                </div>

                <div className="p-6 md:p-8">
                    {/* Stepper Header */}
                    <div className="flex items-center justify-between mb-8">
                        {[1, 2, 3].map(num => (
                            <div key={num} className={`flex items-center flex-1 ${num !== 3 ? 'after:content-[""] after:h-1 after:w-full after:bg-slate-200 after:block after:mx-2' : ''}`}>
                                <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center font-bold ${step >= num ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {num}
                                </div>
                            </div>
                        ))}
                    </div>

                    {step > 1 && (
                        <button onClick={() => setStep(step - 1)} className="flex items-center text-blue-600 font-medium mb-6 hover:underline">
                            <ChevronLeft size={20} /> Voltar
                        </button>
                    )}

                    {/* Step 1: Especialidade e Médico */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-800">Qual a especialidade?</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <button
                                    onClick={() => setSelectedEspecialidade('')}
                                    className={`p-4 rounded-xl border-2 text-left font-medium transition-colors ${selectedEspecialidade === '' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                >
                                    Todos
                                </button>
                                {especialidades.map(esp => (
                                    <button
                                        key={esp}
                                        onClick={() => setSelectedEspecialidade(esp)}
                                        className={`p-4 rounded-xl border-2 text-left font-medium transition-colors ${selectedEspecialidade === esp ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                    >
                                        {esp}
                                    </button>
                                ))}
                            </div>

                            <h2 className="text-xl font-bold text-slate-800 mt-8">Escolha o Profissional</h2>
                            <div className="space-y-3">
                                {medicosFiltrados.map(medico => (
                                    <div 
                                        key={medico.id} 
                                        onClick={() => setSelectedMedico(medico)}
                                        className={`p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-colors ${selectedMedico?.id === medico.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                                    >
                                        <div>
                                            <h3 className="font-bold text-slate-800">{medico.nome}</h3>
                                            <p className="text-sm text-slate-500">{medico.especialidade} • Registro: {medico.crm}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedMedico?.id === medico.id ? 'border-blue-600' : 'border-slate-300'}`}>
                                            {selectedMedico?.id === medico.id && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                                        </div>
                                    </div>
                                ))}
                                {medicosFiltrados.length === 0 && (
                                    <p className="text-slate-500">Nenhum médico encontrado para esta especialidade.</p>
                                )}
                            </div>

                            <button 
                                disabled={!selectedMedico}
                                onClick={() => setStep(2)}
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-8 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                            >
                                Continuar
                            </button>
                        </div>
                    )}

                    {/* Step 2: Data e Hora */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-800">Escolha a Data</h2>
                            <div className="flex overflow-x-auto pb-4 gap-3 snap-x">
                                {availableDates.map(date => {
                                    const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
                                    return (
                                        <button
                                            key={date.toISOString()}
                                            onClick={() => setSelectedDate(date)}
                                            className={`snap-start min-w-[80px] p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-colors ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-200 text-slate-600 hover:border-blue-300 bg-white'}`}
                                        >
                                            <span className="text-xs uppercase font-semibold opacity-80">{format(date, 'EEE', { locale: ptBR })}</span>
                                            <span className="text-2xl font-bold my-1">{format(date, 'dd')}</span>
                                            <span className="text-xs uppercase font-medium opacity-80">{format(date, 'MMM', { locale: ptBR })}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedDate && (
                                <>
                                    <h2 className="text-xl font-bold text-slate-800 mt-8">Escolha o Horário</h2>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {availableTimes.map(time => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`p-3 rounded-xl border-2 font-bold transition-colors ${selectedTime === time ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            <button 
                                disabled={!selectedDate || !selectedTime}
                                onClick={() => setStep(3)}
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-8 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                            >
                                Continuar
                            </button>
                        </div>
                    )}

                    {/* Step 3: Dados do Paciente */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                                <h3 className="font-bold text-slate-800 mb-2">Resumo do Agendamento</h3>
                                <p className="text-slate-600 flex items-center gap-2"><User size={16}/> {selectedMedico?.nome}</p>
                                <p className="text-slate-600 flex items-center gap-2 mt-1"><Calendar size={16}/> {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                                <p className="text-slate-600 flex items-center gap-2 mt-1"><Clock size={16}/> {selectedTime}</p>
                            </div>

                            <h2 className="text-xl font-bold text-slate-800">Seus Dados</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                                    <input 
                                        type="text" 
                                        placeholder="Digite seu nome"
                                        value={pacienteData.nome}
                                        onChange={e => setPacienteData({...pacienteData, nome: e.target.value})}
                                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Telefone / WhatsApp</label>
                                    <input 
                                        type="tel" 
                                        placeholder="(00) 00000-0000"
                                        value={pacienteData.telefone}
                                        onChange={handlePhoneChange}
                                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">CPF</label>
                                    <input 
                                        type="text" 
                                        placeholder="000.000.000-00"
                                        value={pacienteData.cpf}
                                        onChange={handleCpfChange}
                                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={!pacienteData.nome || !pacienteData.telefone || !pacienteData.cpf || submitting}
                                onClick={handleConfirmar}
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-8 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {submitting ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle size={20} />}
                                Confirmar Agendamento
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
