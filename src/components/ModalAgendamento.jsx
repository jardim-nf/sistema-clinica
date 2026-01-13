// src/components/ModalAgendamento.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Check, Trash2, Loader2, Stethoscope, MessageCircle, FileText, AlertCircle } from 'lucide-react';

// --- 1. CONFIGURAÇÃO DOS TEMPLATES (Fora do componente) ---
const TEMPLATES_PADRAO = [
  {
    id: 1,
    titulo: "Confirmação Padrão",
    texto: "Olá {paciente}, confirmamos seu agendamento com {medico} para o dia {data} às {hora}. Responda para confirmar."
  },
  {
    id: 2,
    titulo: "Lembrete Amigável",
    texto: "Oie {paciente}! Passando pra lembrar da sua consulta com {medico} amanhã ({data}) às {hora}. Não esqueça!"
  },
  {
    id: 3,
    titulo: "Pós-Consulta",
    texto: "Olá {paciente}, como você está se sentindo após a consulta com {medico}? Se precisar de algo, nos avise!"
  }
];

// Função auxiliar para trocar as variáveis
function processarTemplate(texto, dados) {
  let mensagemProcessada = texto;
  
  const mapaVariaveis = {
    '{paciente}': dados.pacienteNome ? dados.pacienteNome.split(' ')[0] : '(Nome do Paciente)',
    '{medico}': dados.medicoNome || '(Nome do Médico)',
    '{data}': dados.dataFormatada || '(Data)',
    '{hora}': dados.hora || '(Hora)'
  };

  Object.keys(mapaVariaveis).forEach(chave => {
    mensagemProcessada = mensagemProcessada.replaceAll(chave, mapaVariaveis[chave]);
  });

  return mensagemProcessada;
}

// --- 2. SCHEMA DE VALIDAÇÃO (ZOD) ---
const agendamentoSchema = z.object({
  id: z.any().optional(),
  pacienteId: z.string().min(1, "Selecione um paciente"),
  medicoId: z.string().min(1, "Selecione um médico"),
  data: z.string().min(1, "Data é obrigatória"),
  hora: z.string().min(1, "Horário é obrigatório"),
  tipo: z.string(),
  status: z.string(),
  valor: z.coerce.number().min(0, "Valor não pode ser negativo").optional(), 
  observacoes: z.string().optional(),
});

// --- 3. COMPONENTE PRINCIPAL ---
export default function ModalAgendamento({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  dadosIniciais, 
  listaPacientes, 
  listaMedicos 
}) {
  
  const [templateIdSelecionado, setTemplateIdSelecionado] = useState(1);

  const { 
    register, 
    handleSubmit, 
    watch, 
    reset, 
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      tipo: 'Consulta',
      status: 'agendado',
      valor: 0,
      observacoes: ''
    }
  });

  // Atualiza o formulário quando abre
  useEffect(() => {
    if (isOpen) {
      if (dadosIniciais) {
        reset({
            ...dadosIniciais,
            pacienteId: dadosIniciais.pacienteId || '',
            medicoId: dadosIniciais.medicoId || '',
            valor: dadosIniciais.valor || 0
        });
      } else {
        reset({
          id: null,
          pacienteId: '',
          medicoId: '',
          data: '',
          hora: '',
          tipo: 'Consulta',
          status: 'agendado',
          valor: 0,
          observacoes: ''
        });
      }
      setTemplateIdSelecionado(1); // Reseta o template para o padrão
    }
  }, [isOpen, dadosIniciais, reset]);

  // --- Observadores de Estado (Watch) ---
  const medicoIdObservado = watch('medicoId');
  const pacienteIdObservado = watch('pacienteId');
  const dataObservada = watch('data');
  const horaObservada = watch('hora');
  const idAgendamento = watch('id');

  // --- LÓGICA DE FILTRAGEM DE MÉDICOS (NOVO) ---
  const medicosDisponiveis = useMemo(() => {
    // Se não tem data selecionada, mostra todos (ou poderia não mostrar nenhum, depende da preferência)
    if (!dataObservada) return listaMedicos;
    
    // Obtém o dia da semana (0 = Dom, 1 = Seg, ..., 6 = Sáb)
    // Usamos 'T12:00:00' para evitar problemas de fuso horário voltando o dia
    const diaSemana = new Date(dataObservada + 'T12:00:00').getDay();
    
    return listaMedicos?.filter(medico => {
        // Se o médico não tiver a configuração nova (array vazio ou null), ele aparece sempre (retrocompatibilidade)
        if (!medico.diasAtendimento || medico.diasAtendimento.length === 0) return true;
        
        // Se tiver configuração, verifica se atende neste dia
        return medico.diasAtendimento.includes(diaSemana);
    }) || [];
  }, [dataObservada, listaMedicos]);

  // --- Lógica Derivada ---
  const medicoSelecionado = listaMedicos?.find(m => m.id == medicoIdObservado);
  const pacienteSel = listaPacientes?.find(p => p.id == pacienteIdObservado);
  const iniciais = pacienteSel ? pacienteSel.nome.substring(0, 2).toUpperCase() : 'PC';
  const temTelefone = pacienteSel && (pacienteSel.telefone || pacienteSel.celular);

  // Formata a data para visualização (YYYY-MM-DD -> DD/MM/YYYY)
  const getDataFormatada = () => {
    if (!dataObservada) return null;
    const [ano, mes, dia] = dataObservada.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // --- Handlers ---
  const onSubmit = async (data) => {
    const dadosParaSalvar = {
        ...data,
        medicoNome: medicoSelecionado?.nome || '',
        medicoEspecialidade: medicoSelecionado?.especialidade || ''
    };
    await onSave(dadosParaSalvar);
  };

  const handleDeleteClick = async () => {
     if (isSubmitting || !idAgendamento) return;
     await onDelete(idAgendamento);
  };

  const handleEnviarWhatsapp = () => {
    if (!pacienteSel) return;

    const telefoneBruto = pacienteSel.telefone || pacienteSel.celular || '';
    const telefoneLimpo = telefoneBruto.replace(/\D/g, '');

    if (!telefoneLimpo) {
      alert("Este paciente não possui número de telefone cadastrado.");
      return;
    }

    // Prepara os dados para preencher o template
    const dadosParaTemplate = {
        pacienteNome: pacienteSel.nome,
        medicoNome: medicoSelecionado?.nome,
        dataFormatada: getDataFormatada(),
        data: dataObservada,
        hora: horaObservada
    };

    // Busca o texto do template e processa
    const templateObj = TEMPLATES_PADRAO.find(t => t.id == templateIdSelecionado);
    const mensagemFinal = processarTemplate(templateObj.texto, dadosParaTemplate);
    
    const numeroFinal = telefoneLimpo.length <= 11 ? `55${telefoneLimpo}` : telefoneLimpo;
    const url = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensagemFinal)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {idAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
          </div>
          <button onClick={onClose} disabled={isSubmitting} type="button" className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition"><X size={20} /></button>
        </div>

        {/* FORMULÁRIO COM SCROLL */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* 1. DATA E HORA (MOVIDO PARA O TOPO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Data</label>
              <input 
                type="date" 
                {...register('data')}
                className={`w-full px-4 py-2 border rounded-xl text-slate-700 text-sm font-medium ${errors.data ? 'border-red-500' : 'border-slate-200'}`} 
              />
              {errors.data && <p className="text-xs text-red-500 mt-1">{errors.data.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Horário</label>
              <input 
                type="time" 
                {...register('hora')}
                className={`w-full px-4 py-2 border rounded-xl text-slate-700 text-sm font-medium ${errors.hora ? 'border-red-500' : 'border-slate-200'}`} 
              />
               {errors.hora && <p className="text-xs text-red-500 mt-1">{errors.hora.message}</p>}
            </div>
          </div>

          {/* 2. SELEÇÃO DE MÉDICO (FILTRADO) */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Profissional / Médico</label>
             <div className={`flex items-center gap-3 p-2 border rounded-xl bg-slate-50 focus-within:border-emerald-500 focus-within:bg-white transition-colors ${errors.medicoId ? 'border-red-500' : 'border-slate-200'}`}>
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Stethoscope size={20} />
                </div>
                <div className="flex-1">
                    <select 
                      {...register('medicoId')}
                      className="w-full bg-transparent border-none outline-none text-slate-700 font-bold text-sm h-full py-1"
                    >
                      <option value="">Selecione o médico...</option>
                      {/* ALTERAÇÃO: Usa medicosDisponiveis em vez de listaMedicos */}
                      {medicosDisponiveis?.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} - {m.especialidade}</option>
                      ))}
                    </select>
                </div>
             </div>
             
             {/* ALERTA SE A LISTA ESTIVER VAZIA PARA O DIA */}
             {dataObservada && medicosDisponiveis?.length === 0 && (
                 <p className="text-xs text-orange-500 mt-1.5 ml-2 flex items-center gap-1 font-medium bg-orange-50 p-1.5 rounded-lg border border-orange-100">
                    <AlertCircle size={14}/> Nenhum médico atende neste dia da semana.
                 </p>
             )}

             {errors.medicoId && <p className="text-xs text-red-500 mt-1 ml-2">{errors.medicoId.message}</p>}
             {medicoSelecionado && !errors.medicoId && (
                <p className="text-xs text-emerald-600 mt-1 ml-2 font-medium">Especialidade: {medicoSelecionado.especialidade}</p>
             )}
          </div>

          {/* 3. SELEÇÃO DE PACIENTE */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Paciente</label>
             <div className={`flex items-center gap-3 p-2 border rounded-xl bg-slate-50 ${errors.pacienteId ? 'border-red-500' : 'border-slate-200'}`}>
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {iniciais}
                </div>
                <select 
                  {...register('pacienteId')}
                  className="w-full bg-transparent border-none outline-none text-slate-700 font-medium text-sm h-full py-2"
                >
                  <option value="">Selecione o paciente...</option>
                  {listaPacientes?.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
             </div>
             {errors.pacienteId && <p className="text-xs text-red-500 mt-1 ml-2">{errors.pacienteId.message}</p>}
             
             {/* --- ÁREA DO WHATSAPP + TEMPLATES --- */}
             {pacienteSel && temTelefone && (
               <div className="mt-4 p-3 bg-green-50/50 border border-green-100 rounded-xl space-y-3">
                  
                  {/* Seletor de Template */}
                  <div className="flex items-center gap-2">
                     <FileText size={16} className="text-green-600"/>
                     <label className="text-xs font-bold text-green-700 uppercase">Mensagem WhatsApp</label>
                  </div>
                  
                  <select 
                    value={templateIdSelecionado}
                    onChange={(e) => setTemplateIdSelecionado(Number(e.target.value))}
                    className="w-full p-2 border border-green-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:border-green-500 transition"
                  >
                    {TEMPLATES_PADRAO.map(t => (
                      <option key={t.id} value={t.id}>{t.titulo}</option>
                    ))}
                  </select>
                  
                  {/* Preview da Mensagem */}
                  <div className="text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200 shadow-sm italic leading-relaxed">
                    "
                    {processarTemplate(
                        TEMPLATES_PADRAO.find(t => t.id == templateIdSelecionado)?.texto || '', 
                        {
                            pacienteNome: pacienteSel.nome,
                            medicoNome: medicoSelecionado?.nome,
                            dataFormatada: getDataFormatada(),
                            hora: horaObservada
                        }
                    )}
                    "
                  </div>

                  {/* Botão Enviar */}
                  <button
                      type="button"
                      onClick={handleEnviarWhatsapp}
                      className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 transition shadow-sm hover:shadow-md font-bold text-sm"
                  >
                      <MessageCircle size={18} />
                      Enviar Mensagem
                  </button>
               </div>
             )}
             
             {/* Aviso se não tiver telefone */}
             {pacienteSel && !temTelefone && (
                <div className="mt-2 w-full py-2 px-3 bg-slate-100 text-slate-400 rounded-xl text-xs flex items-center gap-2 border border-slate-200">
                    <MessageCircle size={16} />
                    <span>Paciente sem telefone cadastrado</span>
                </div>
             )}
          </div>

          <div className="grid grid-cols-3 gap-3">
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo</label>
                <select {...register('tipo')} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                   <option>Consulta</option>
                   <option>Retorno</option>
                   <option>Exame</option>
                </select>
             </div>
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select {...register('status')} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                   <option value="agendado">Agendado</option>
                   <option value="confirmado">Confirmado</option>
                   <option value="realizado">Realizado</option>
                   <option value="cancelado">Cancelado</option>
                </select>
             </div>
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor (R$)</label>
                <input 
                    type="number" 
                    step="0.01"
                    {...register('valor')}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm" 
                    placeholder="0.00" 
                />
             </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Observações</label>
            <textarea 
                rows={2} 
                {...register('observacoes')}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 resize-none" 
            />
          </div>

        </form>

        {/* FOOTER (Fixo embaixo) */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
             {idAgendamento && (
                <button type="button" onClick={handleDeleteClick} disabled={isSubmitting} className="px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold transition disabled:opacity-50">
                    <Trash2 size={20}/>
                </button>
             )}
             <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm">Cancelar</button>
             <button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50">
                 {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>} Salvar
             </button>
        </div>

      </div>
    </div>
  );
}