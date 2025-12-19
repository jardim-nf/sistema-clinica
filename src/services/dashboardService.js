import { db } from './firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'firebase/firestore';

export const dashboardService = {
  // 1. Cards de Resumo (Pacientes, Hoje, Faturamento)
  async getResumo(idUsuario) {
    // idUsuario deve ser o user.uid
    console.log("🔍 [Dashboard] Buscando dados para userId:", idUsuario);
    
    try {
      const hojeInicio = new Date();
      hojeInicio.setHours(0, 0, 0, 0);
      
      const hojeFim = new Date();
      hojeFim.setHours(23, 59, 59, 999);

      // --- BUSCA PACIENTES ---
      // IMPORTANTE: Busca por 'userId' para casar com seu banco de dados
      const qPacientes = query(
        collection(db, 'pacientes'), 
        where('userId', '==', idUsuario) 
      );
      const snapPacientes = await getDocs(qPacientes);
      console.log(`👤 [Dashboard] Pacientes encontrados: ${snapPacientes.size}`);

      // --- BUSCA AGENDAMENTOS ---
      const qAgendamentos = query(
        collection(db, 'agendamentos'),
        where('userId', '==', idUsuario)
      );
      const snapAgendamentos = await getDocs(qAgendamentos);
      console.log(`📅 [Dashboard] Agendamentos encontrados: ${snapAgendamentos.size}`);
      
      let faturamentoTotal = 0;
      let consultasHoje = 0;
      let consultasTotal = 0; // Para taxa de conversão

      snapAgendamentos.forEach(doc => {
        const data = doc.data();
        
        // Tratamento de Data (Timestamp ou String ISO)
        let dataConsulta;
        if (data.start?.toDate) {
             dataConsulta = data.start.toDate(); 
        } else if (data.start) {
             dataConsulta = new Date(data.start);
        }

        // Consultas de Hoje
        if (dataConsulta && dataConsulta >= hojeInicio && dataConsulta <= hojeFim) {
          consultasHoje++;
        }

        // Taxa de Conversão (realizado/concluido)
        if (['realizado', 'concluido'].includes(data.status?.toLowerCase())) {
          consultasTotal++;
        }

        // Faturamento (Limpa "R$ 1.200,00" para float)
        if (data.valor) {
          const valorLimpo = String(data.valor)
            .replace('R$', '')
            .replace(/\./g, '') // Remove ponto de milhar
            .replace(',', '.')  // Troca vírgula por ponto
            .trim();
          faturamentoTotal += parseFloat(valorLimpo) || 0;
        }
      });

      return {
        pacientes: snapPacientes.size,
        hoje: consultasHoje,
        faturamento: faturamentoTotal,
        taxaConversao: snapAgendamentos.size > 0 ? Math.round((consultasTotal / snapAgendamentos.size) * 100) : 0,
        crescimento: { 
          pacientes: 0, 
          faturamento: 0, 
          consultas: 0 
        }
      };

    } catch (error) {
      console.error("❌ [Dashboard] Erro no getResumo:", error);
      return { pacientes: 0, hoje: 0, faturamento: 0, taxaConversao: 0 };
    }
  },

  // 2. Gráfico Financeiro (Últimos 6 meses)
  async getGraficoFinanceiro(idUsuario) {
    try {
      const hoje = new Date();
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(hoje.getMonth() - 5);
      seisMesesAtras.setDate(1); 

      // Busca simples sem ordenação para evitar erro de índice
      const q = query(
        collection(db, 'agendamentos'),
        where('userId', '==', idUsuario)
      );
      
      const snapshot = await getDocs(q);
      
      const dadosPorMes = {};
      // Inicializa os últimos 6 meses com 0
      for (let i = 0; i < 6; i++) {
        const d = new Date(seisMesesAtras);
        d.setMonth(d.getMonth() + i);
        const mesKey = d.toLocaleDateString('pt-BR', { month: 'short' });
        const keyFormatada = mesKey.charAt(0).toUpperCase() + mesKey.slice(1);
        dadosPorMes[keyFormatada] = 0;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        let dataConsulta;
        if (data.start?.toDate) dataConsulta = data.start.toDate();
        else dataConsulta = new Date(data.start);

        // Filtra apenas os últimos 6 meses no Javascript
        if (dataConsulta >= seisMesesAtras) {
          const mesKey = dataConsulta.toLocaleDateString('pt-BR', { month: 'short' });
          const keyFormatada = mesKey.charAt(0).toUpperCase() + mesKey.slice(1);

          if (data.valor && dadosPorMes.hasOwnProperty(keyFormatada)) {
            const valorLimpo = String(data.valor)
              .replace('R$', '')
              .replace(/\./g, '')
              .replace(',', '.')
              .trim();
            dadosPorMes[keyFormatada] += parseFloat(valorLimpo) || 0;
          }
        }
      });

      return Object.entries(dadosPorMes).map(([name, total]) => ({ name, total }));

    } catch (error) {
      console.error("❌ [Dashboard] Erro no gráfico:", error);
      return [];
    }
  },

  // 3. Próximas Consultas
  async getProximasConsultas(idUsuario) {
    try {
      const q = query(
        collection(db, 'agendamentos'),
        where('userId', '==', idUsuario),
        limit(20) // Traz 20 e filtra data no front
      );

      const snapshot = await getDocs(q);
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      
      const lista = snapshot.docs
        .map(doc => {
          const data = doc.data();
          let dataObj;
          if (data.start?.toDate) dataObj = data.start.toDate();
          else dataObj = new Date(data.start);

          return {
            id: doc.id,
            paciente: data.pacienteNome || 'Paciente',
            data: dataObj,
            dataIso: dataObj.toISOString(),
            hora: dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            status: data.status,
            observacoes: data.observacoes
          };
        })
        .filter(item => item.data >= hoje) // Apenas futuras ou de hoje
        .sort((a, b) => a.data - b.data)   // Ordena data crescente
        .slice(0, 5);                      // Pega 5

      return lista;

    } catch (error) {
      console.error("❌ [Dashboard] Erro proximas consultas:", error);
      return [];
    }
  },

  // 4. Pacientes Recentes (COM FALLBACK DE SEGURANÇA)
  async getPacientesRecentes(idUsuario) {
    try {
      // 1ª Tentativa: Busca Bonita (Ordenada pelo banco)
      // Pode falhar se faltar índice ou se o paciente não tiver o campo 'createdAt'
      const q = query(
        collection(db, 'pacientes'),
        where('userId', '==', idUsuario),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(q);
      
      // Se retornou dados, ótimo!
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString()
        }));
      }

      // Se chegou aqui, ou a lista está vazia ou os pacientes antigos não têm 'createdAt' e foram ignorados pelo orderBy
      console.warn("⚠️ [Dashboard] Lista ordenada vazia. Tentando busca sem ordenação (Fallback).");
      throw new Error("Fallback necessário");

    } catch (error) {
      // 2ª Tentativa: Fallback (Busca tudo e ordena no Javascript)
      try {
        const qFallback = query(
            collection(db, 'pacientes'),
            where('userId', '==', idUsuario),
            limit(10) // Limite seguro
        );
        const snap = await getDocs(qFallback);
        
        return snap.docs
            .map(d => {
                const data = d.data();
                // Se não tem data de criação, usa a data atual para não quebrar
                const dataCriacao = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                return {
                    id: d.id,
                    ...data,
                    createdAt: dataCriacao.toISOString()
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Ordena JS
            .slice(0, 5);
      } catch (e) {
        console.error("❌ [Dashboard] Erro fatal em pacientes recentes:", e);
        return [];
      }
    }
  }
};