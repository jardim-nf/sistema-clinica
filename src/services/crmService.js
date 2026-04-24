import { db } from './firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { format, subMonths, isSameDay } from 'date-fns';

export const crmService = {
  // Verifica e cria notificações de aniversário
  verificarAniversariantesHoje: async (clinicaId) => {
    try {
      const q = query(collection(db, 'pacientes'), where('clinicaId', '==', clinicaId));
      const snapshot = await getDocs(q);
      const hojeStr = format(new Date(), 'dd/MM');
      
      const aniversariantes = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(paciente => {
          if (!paciente.dataNascimento) return false;
          // Pega os ultimos 5 chars (MM-DD) e formata para comparar
          const dataFormatada = paciente.dataNascimento.includes('-') 
            ? `${paciente.dataNascimento.split('-')[2]}/${paciente.dataNascimento.split('-')[1]}` 
            : null;
          return dataFormatada === hojeStr;
        });

      return aniversariantes;
    } catch (error) {
      console.error("Erro ao verificar aniversariantes:", error);
      return [];
    }
  },

  // Busca pacientes que vieram há 6 meses atrás para retorno
  verificarRetornosPendentes: async (clinicaId) => {
    try {
      const dataAlvo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      
      const q = query(
        collection(db, 'agendamentos'), 
        where('userId', '==', clinicaId),
        where('status', 'in', ['atendido', 'confirmado']),
        where('data', '==', dataAlvo)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erro ao verificar retornos:", error);
      return [];
    }
  },

  // Dispara campanhas ou envia mensagens no whatsapp (Mock - Requer integração com bot)
  enviarMensagemMarketing: async (telefone, mensagem, tipo, clinicaId) => {
    // 1. Registra no histórico de comunicações
    await addDoc(collection(db, 'marketing_logs'), {
      clinicaId,
      telefone,
      mensagem,
      tipo, // 'aniversario', 'retorno', 'promocao'
      status: 'enviado',
      dataEnvio: serverTimestamp()
    });

    // 2. Chama backend ou API de WhatsApp
    // Para simplificar no frontend, enviamos pro firebase e uma Cloud Function poderia pescar,
    // ou disparamos axios aqui se houvesse endpoint do bot aberto
    console.log(`Mensagem de CRM (${tipo}) enviada para ${telefone}: ${mensagem}`);
  }
};
