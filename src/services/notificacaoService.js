import { db } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { format, addHours, isWithinInterval, parseISO } from 'date-fns';

class NotificacaoService {
  // Tipos de notificação
  static TIPOS_NOTIFICACAO = {
    LEMBRETE_CONSULTA: 'lembrete_consulta',
    CONFIRMACAO_AGENDAMENTO: 'confirmacao_agendamento',
    CANCELAMENTO_CONSULTA: 'cancelamento_consulta',
    NOVO_AGENDAMENTO: 'novo_agendamento',
    PAGAMENTO_CONFIRMADO: 'pagamento_confirmado',
    MENSAGEM_SISTEMA: 'mensagem_sistema',
    TESTE: 'teste'
  };

  // Canais de envio
  static CANAIS_ENVIO = {
    EMAIL: 'email',
    WHATSAPP: 'whatsapp',
    SMS: 'sms',
    SISTEMA: 'sistema'
  };

  // Status da notificação
  static STATUS = {
    PENDENTE: 'pendente',
    ENVIADA: 'enviada',
    FALHA: 'falha',
    LIDA: 'lida'
  };

  /**
   * Salvar configurações de notificação do usuário
   */
  static async salvarConfiguracoes(userId, config) {
    try {
      const userRef = doc(db, 'usuarios', userId);
      const configRef = doc(db, 'configuracoes_notificacoes', userId);
      
      // Atualiza no usuário
      await updateDoc(userRef, {
        configNotificacoes: config,
        atualizadoEm: serverTimestamp()
      });

      // Salva na coleção específica
      await setDoc(configRef, {
        ...config,
        userId,
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw error;
    }
  }

  /**
   * Buscar configurações de notificação do usuário
   */
  static async buscarConfiguracoes(userId) {
    try {
      const configRef = doc(db, 'configuracoes_notificacoes', userId);
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        return configSnap.data();
      }
      
      // Tenta buscar do documento do usuário
      const userRef = doc(db, 'usuarios', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists() && userSnap.data().configNotificacoes) {
        return userSnap.data().configNotificacoes;
      }
      
      // Configurações padrão
      return {
        lembreteConsulta: true,
        intervaloLembrete: 24,
        autoConfirmacaoAgendamento: true,
        notificacoesEmail: true,
        notificacoesWhatsapp: false,
        notificacoesSMS: false,
        horarioInicioNotificacoes: '08:00',
        horarioFimNotificacoes: '20:00',
        diasAntecedencia: [1, 2, 7],
        templateEmail: 'padrao',
        templateWhatsapp: 'padrao',
        nomeClinica: '',
        endereco: '',
        telefone: '',
        emailClinica: ''
      };
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      // Retorna configurações padrão em caso de erro
      return {
        lembreteConsulta: true,
        intervaloLembrete: 24,
        autoConfirmacaoAgendamento: true,
        notificacoesEmail: true,
        notificacoesWhatsapp: false,
        notificacoesSMS: false,
        horarioInicioNotificacoes: '08:00',
        horarioFimNotificacoes: '20:00',
        diasAntecedencia: [1, 2, 7],
        templateEmail: 'padrao',
        templateWhatsapp: 'padrao'
      };
    }
  }

  /**
   * Criar uma nova notificação
   */
  static async criarNotificacao(notificacao) {
    try {
      const notificacaoCompleta = {
        ...notificacao,
        status: this.STATUS.PENDENTE,
        tentativas: 0,
        criadaEm: serverTimestamp(),
        agendadaPara: notificacao.agendadaPara || serverTimestamp(),
        userId: notificacao.userId
      };

      const docRef = await addDoc(
        collection(db, 'notificacoes'), 
        notificacaoCompleta
      );

      console.log('Notificação criada:', docRef.id);
      return { id: docRef.id, ...notificacaoCompleta };
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  /**
   * Simular envio de e-mail (para desenvolvimento)
   */
  static async enviarEmailSimulado(destinatario, assunto, conteudo) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('📧 E-mail simulado enviado para:', destinatario);
        console.log('Assunto:', assunto);
        console.log('Conteúdo:', conteudo.substring(0, 100) + '...');
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Simular envio de WhatsApp (para desenvolvimento)
   */
  static async enviarWhatsappSimulado(numero, mensagem) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('📱 WhatsApp simulado enviado para:', numero);
        console.log('Mensagem:', mensagem.substring(0, 100) + '...');
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Simular envio de SMS (para desenvolvimento)
   */
  static async enviarSMSSimulado(numero, mensagem) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('📲 SMS simulado enviado para:', numero);
        console.log('Mensagem:', mensagem.substring(0, 100) + '...');
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Enviar notificação de teste
   */
  static async enviarNotificacaoTeste(config, usuarioTeste) {
    const resultados = [];

    // Testar e-mail
    if (config.notificacoesEmail && usuarioTeste.email) {
      try {
        const assunto = 'Teste de Notificação - Sistema Clínica';
        const conteudo = `
          Olá ${usuarioTeste.nome || 'Usuário'},

          Esta é uma mensagem de teste do sistema de notificações da clínica ${config.nomeClinica || 'Sua Clínica'}.
          
          Se você recebeu esta mensagem, as configurações de e-mail estão funcionando corretamente.
          
          Data do teste: ${new Date().toLocaleDateString('pt-BR')}
          Hora: ${new Date().toLocaleTimeString('pt-BR')}
          
          Atenciosamente,
          Sistema Clínica
        `;

        await this.enviarEmailSimulado(usuarioTeste.email, assunto, conteudo);
        
        // Registrar no histórico
        await this.criarNotificacao({
          tipo: this.TIPOS_NOTIFICACAO.TESTE,
          destinatarioEmail: usuarioTeste.email,
          canal: this.CANAIS_ENVIO.EMAIL,
          assunto: assunto,
          conteudo: conteudo,
          status: this.STATUS.ENVIADA,
          enviadaEm: serverTimestamp(),
          userId: config.userId
        });

        resultados.push({
          canal: 'E-mail',
          status: 'sucesso',
          mensagem: 'E-mail de teste enviado com sucesso'
        });
      } catch (error) {
        console.error('Erro no teste de e-mail:', error);
        resultados.push({
          canal: 'E-mail',
          status: 'erro',
          mensagem: error.message || 'Erro ao enviar e-mail'
        });
      }
    }

    // Testar WhatsApp
    if (config.notificacoesWhatsapp && usuarioTeste.telefone) {
      try {
        const mensagem = `✅ Teste de Notificação - ${config.nomeClinica || 'Sua Clínica'}\n\nEsta é uma mensagem de teste do sistema de notificações.\n\nData: ${new Date().toLocaleDateString('pt-BR')}\nHora: ${new Date().toLocaleTimeString('pt-BR')}\n\nSistema Clínica`;

        await this.enviarWhatsappSimulado(usuarioTeste.telefone, mensagem);
        
        // Registrar no histórico
        await this.criarNotificacao({
          tipo: this.TIPOS_NOTIFICACAO.TESTE,
          destinatarioWhatsapp: usuarioTeste.telefone,
          canal: this.CANAIS_ENVIO.WHATSAPP,
          conteudo: mensagem,
          status: this.STATUS.ENVIADA,
          enviadaEm: serverTimestamp(),
          userId: config.userId
        });

        resultados.push({
          canal: 'WhatsApp',
          status: 'sucesso',
          mensagem: 'Mensagem de teste enviada com sucesso'
        });
      } catch (error) {
        console.error('Erro no teste de WhatsApp:', error);
        resultados.push({
          canal: 'WhatsApp',
          status: 'erro',
          mensagem: error.message || 'Erro ao enviar WhatsApp'
        });
      }
    }

    // Testar SMS
    if (config.notificacoesSMS && usuarioTeste.telefone) {
      try {
        const mensagem = `Teste Sistema Clinica: Notificacoes funcionando. Data: ${new Date().toLocaleDateString('pt-BR')}`;

        await this.enviarSMSSimulado(usuarioTeste.telefone, mensagem);
        
        // Registrar no histórico
        await this.criarNotificacao({
          tipo: this.TIPOS_NOTIFICACAO.TESTE,
          destinatarioSMS: usuarioTeste.telefone,
          canal: this.CANAIS_ENVIO.SMS,
          conteudo: mensagem,
          status: this.STATUS.ENVIADA,
          enviadaEm: serverTimestamp(),
          userId: config.userId
        });

        resultados.push({
          canal: 'SMS',
          status: 'sucesso',
          mensagem: 'SMS de teste enviado com sucesso'
        });
      } catch (error) {
        console.error('Erro no teste de SMS:', error);
        resultados.push({
          canal: 'SMS',
          status: 'erro',
          mensagem: error.message || 'Erro ao enviar SMS'
        });
      }
    }

    return resultados;
  }

  /**
   * Testar configurações de notificação
   */
  static async testarConfiguracoes(config, usuarioTeste) {
    try {
      // Adiciona userId ao config se disponível
      const configCompleta = {
        ...config,
        userId: usuarioTeste.userId || 'test'
      };

      const resultados = await this.enviarNotificacaoTeste(configCompleta, usuarioTeste);
      return resultados;
    } catch (error) {
      console.error('Erro no teste de notificações:', error);
      throw error;
    }
  }

  /**
   * Buscar histórico de notificações
   */
  static async buscarHistorico(userId, limite = 10) {
    try {
      const q = query(
        collection(db, 'notificacoes'),
        where('userId', '==', userId),
        orderBy('criadaEm', 'desc'),
        limit(limite)
      );

      const querySnapshot = await getDocs(q);
      const notificacoes = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          criadaEm: data.criadaEm?.toDate?.(),
          enviadaEm: data.enviadaEm?.toDate?.(),
          agendadaPara: data.agendadaPara?.toDate?.()
        };
      });

      return notificacoes;
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      
      // Fallback: retorna notificações de exemplo
      return [
        {
          id: '1',
          tipo: this.TIPOS_NOTIFICACAO.TESTE,
          assunto: 'Teste de Notificação',
          conteudo: 'Esta é uma notificação de teste do sistema.',
          status: this.STATUS.ENVIADA,
          canal: this.CANAIS_ENVIO.EMAIL,
          criadaEm: new Date(Date.now() - 86400000), // 1 dia atrás
          enviadaEm: new Date(Date.now() - 86400000)
        },
        {
          id: '2',
          tipo: this.TIPOS_NOTIFICACAO.LEMBRETE_CONSULTA,
          assunto: 'Lembrete de Consulta',
          conteudo: 'Lembrete da consulta com Dr. Silva amanhã às 14:00.',
          status: this.STATUS.ENVIADA,
          canal: this.CANAIS_ENVIO.WHATSAPP,
          criadaEm: new Date(Date.now() - 172800000), // 2 dias atrás
          enviadaEm: new Date(Date.now() - 172800000)
        }
      ];
    }
  }

  /**
   * Enviar lembrete de consulta (simulado)
   */
  static async enviarLembreteConsulta(consulta, config) {
    try {
      console.log('📅 Enviando lembrete para consulta:', consulta.id);
      
      const mensagem = `
        Olá ${consulta.pacienteNome || 'Paciente'}!
        
        Lembrete da sua consulta:
        📅 Data: ${consulta.data ? format(new Date(consulta.data), 'dd/MM/yyyy') : '--/--/----'}
        ⏰ Horário: ${consulta.hora || '--:--'}
        👨‍⚕️ Médico: ${consulta.medicoNome || 'Médico'}
        📍 Local: ${config.nomeClinica || 'Sua Clínica'}
        
        Por favor, chegue com 15 minutos de antecedência.
        
        Para reagendar ou cancelar, entre em contato: ${config.telefone || ''}
        
        Atenciosamente,
        ${config.nomeClinica || 'Sua Clínica'}
      `;

      const notificacoes = [];

      // E-mail
      if (config.notificacoesEmail && consulta.pacienteEmail) {
        notificacoes.push(
          this.criarNotificacao({
            tipo: this.TIPOS_NOTIFICACAO.LEMBRETE_CONSULTA,
            destinatarioEmail: consulta.pacienteEmail,
            canal: this.CANAIS_ENVIO.EMAIL,
            assunto: `Lembrete de Consulta - ${config.nomeClinica || 'Sua Clínica'}`,
            conteudo: mensagem,
            consultaId: consulta.id,
            status: this.STATUS.ENVIADA,
            enviadaEm: serverTimestamp(),
            userId: config.userId
          })
        );
      }

      // WhatsApp
      if (config.notificacoesWhatsapp && consulta.pacienteTelefone) {
        notificacoes.push(
          this.criarNotificacao({
            tipo: this.TIPOS_NOTIFICACAO.LEMBRETE_CONSULTA,
            destinatarioWhatsapp: consulta.pacienteTelefone,
            canal: this.CANAIS_ENVIO.WHATSAPP,
            conteudo: mensagem,
            consultaId: consulta.id,
            status: this.STATUS.ENVIADA,
            enviadaEm: serverTimestamp(),
            userId: config.userId
          })
        );
      }

      await Promise.all(notificacoes);
      console.log('✅ Lembretes enviados para consulta:', consulta.id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar lembrete:', error);
      return false;
    }
  }

  /**
   * Enviar confirmação de agendamento (simulado)
   */
  static async enviarConfirmacaoAgendamento(consulta, config) {
    try {
      console.log('✅ Enviando confirmação para agendamento:', consulta.id);
      
      const mensagem = `
        ✅ Agendamento Confirmado!
        
        Olá ${consulta.pacienteNome || 'Paciente'},
        
        Seu agendamento foi confirmado com sucesso:
        
        📅 Data: ${consulta.data ? format(new Date(consulta.data), 'dd/MM/yyyy') : '--/--/----'}
        ⏰ Horário: ${consulta.hora || '--:--'}
        👨‍⚕️ Médico: ${consulta.medicoNome || 'Médico'}
        📍 Local: ${config.endereco || config.nomeClinica || 'Sua Clínica'}
        📞 Contato: ${config.telefone || ''}
        
        Valor da Consulta: R$ ${consulta.valor || '--'}
        Forma de Pagamento: ${consulta.formaPagamento || 'A combinar'}
        
        IMPORTANTE:
        - Chegue com 15 minutos de antecedência
        - Traga documentos e exames anteriores
        - Use máscara (se necessário)
        
        Para cancelar ou reagendar, entre em contato com 24h de antecedência.
        
        Agradecemos pela confiança!
        
        Atenciosamente,
        ${config.nomeClinica || 'Sua Clínica'}
      `;

      // Enviar notificações
      const notificacoes = [];

      if (config.notificacoesEmail && consulta.pacienteEmail) {
        await this.enviarEmailSimulado(
          consulta.pacienteEmail,
          `Confirmação de Agendamento - ${config.nomeClinica || 'Sua Clínica'}`,
          mensagem
        );

        notificacoes.push(
          this.criarNotificacao({
            tipo: this.TIPOS_NOTIFICACAO.CONFIRMACAO_AGENDAMENTO,
            destinatarioEmail: consulta.pacienteEmail,
            canal: this.CANAIS_ENVIO.EMAIL,
            assunto: 'Confirmação de Agendamento',
            conteudo: mensagem,
            consultaId: consulta.id,
            status: this.STATUS.ENVIADA,
            enviadaEm: serverTimestamp(),
            userId: config.userId
          })
        );
      }

      if (config.notificacoesWhatsapp && consulta.pacienteTelefone) {
        await this.enviarWhatsappSimulado(consulta.pacienteTelefone, mensagem);

        notificacoes.push(
          this.criarNotificacao({
            tipo: this.TIPOS_NOTIFICACAO.CONFIRMACAO_AGENDAMENTO,
            destinatarioWhatsapp: consulta.pacienteTelefone,
            canal: this.CANAIS_ENVIO.WHATSAPP,
            conteudo: mensagem,
            consultaId: consulta.id,
            status: this.STATUS.ENVIADA,
            enviadaEm: serverTimestamp(),
            userId: config.userId
          })
        );
      }

      await Promise.all(notificacoes);
      console.log('✅ Confirmação enviada para:', consulta.pacienteNome);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar confirmação:', error);
      return false;
    }
  }

  /**
   * Verificar e enviar lembretes pendentes
   */
  static async verificarLembretesPendentes(userId, config) {
    try {
      // Busca consultas agendadas para os próximos dias
      const hoje = new Date();
      const fimPeriodo = addHours(hoje, config.intervaloLembrete || 24);
      
      // Em um sistema real, você buscaria as consultas do Firestore
      // Aqui é apenas um exemplo
      console.log('🔍 Verificando lembretes pendentes...');
      
      // Consultas de exemplo (substitua por consultas reais do seu banco)
      const consultasPendentes = [
        {
          id: 'consulta-exemplo-1',
          pacienteNome: 'João Silva',
          pacienteEmail: 'joao@exemplo.com',
          pacienteTelefone: '11999999999',
          medicoNome: 'Dr. Carlos',
          data: addHours(hoje, 26).toISOString(), // 26 horas no futuro
          hora: '14:00',
          valor: 250
        }
      ];

      const resultados = [];
      for (const consulta of consultasPendentes) {
        const dataConsulta = new Date(consulta.data);
        if (dataConsulta > hoje && dataConsulta <= fimPeriodo) {
          const resultado = await this.enviarLembreteConsulta(consulta, config);
          resultados.push({ consultaId: consulta.id, sucesso: resultado });
        }
      }

      console.log(`✅ ${resultados.filter(r => r.sucesso).length} lembretes enviados`);
      return resultados;
    } catch (error) {
      console.error('❌ Erro ao verificar lembretes:', error);
      return [];
    }
  }

  /**
   * Marcar notificação como lida
   */
  static async marcarComoLida(notificacaoId) {
    try {
      await updateDoc(doc(db, 'notificacoes', notificacaoId), {
        status: this.STATUS.LIDA,
        lidaEm: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      throw error;
    }
  }

  /**
   * Limpar histórico antigo (mais de 30 dias)
   */
  static async limparHistoricoAntigo(userId) {
    try {
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      
      const q = query(
        collection(db, 'notificacoes'),
        where('userId', '==', userId),
        where('criadaEm', '<', trintaDiasAtras),
        where('status', '==', this.STATUS.LIDA)
      );

      const querySnapshot = await getDocs(q);
      const deletarPromises = querySnapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'notificacoes', docSnap.id))
      );

      await Promise.all(deletarPromises);
      console.log(`🗑️ ${querySnapshot.size} notificações antigas removidas`);
      return querySnapshot.size;
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      return 0;
    }
  }
}

export default NotificacaoService;