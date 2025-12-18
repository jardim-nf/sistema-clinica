// src/services/dashboardService.js - FINALIZADO: Contagem de Pacientes e Fluxo de Data Corretos

import { db } from './firebaseConfig';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';

export const dashboardService = {

  // 1. CARDS DE RESUMO
  getResumo: async (clinicaId) => {
    if (!clinicaId) return { pacientes: 0, hoje: 0, faturamento: 0 };

    const hojeString = new Date().toISOString().split('T')[0]; // Ex: "2025-12-16"
    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth();
    const anoAtual = dataAtual.getFullYear();

    const pacientesRef = collection(db, 'pacientes');
    const agendamentosRef = collection(db, 'agendamentos');
    const despesasRef = collection(db, 'despesas');

    // --- CORREÇÃO CRÍTICA AQUI: Usar 'userId' em vez de 'estabelecimentoId' na coleção 'pacientes' ---
    const qPacientes = query(pacientesRef, where('userId', '==', clinicaId));
    
    // As outras coleções continuam usando 'userId' (o que está correto)
    const qAgendamentos = query(agendamentosRef, where('userId', '==', clinicaId));
    const qDespesas = query(despesasRef, where('userId', '==', clinicaId));

    // Executa as consultas
    const [snapPacientes, snapAgendamentos, snapDespesas] = await Promise.all([
        getDocs(qPacientes),
        getDocs(qAgendamentos),
        getDocs(qDespesas)
    ]);

    const totalPacientes = snapPacientes.size;
    
    let consultasHoje = 0;
    let receitasMes = 0;

    snapAgendamentos.forEach(doc => {
      const dados = doc.data();
      if (dados.status === 'cancelado') return;

      // Usa a string de data formatada para comparar agendamentos de hoje
      if (dados.data === hojeString) {
        consultasHoje++;
      }

      if (dados.data) {
        const dataAgendamento = new Date(dados.data + 'T12:00:00');
        if (dataAgendamento.getMonth() === mesAtual && dataAgendamento.getFullYear() === anoAtual) {
           const valor = parseFloat(dados.valor) || 0;
           receitasMes += valor;
        }
      }
    });

    let despesasMes = 0;
    snapDespesas.forEach(doc => {
        const dados = doc.data();
        if (dados.data) {
            const dataDespesa = new Date(dados.data + 'T12:00:00');
            if (dataDespesa.getMonth() === mesAtual && dataDespesa.getFullYear() === anoAtual) {
                despesasMes += (parseFloat(dados.valor) || 0);
            }
        }
    });

    const faturamentoTotal = receitasMes - despesasMes;

    return {
      pacientes: totalPacientes,
      hoje: consultasHoje,
      faturamento: faturamentoTotal
    };
  },

  // 2. GRÁFICO FINANCEIRO
  getGraficoFinanceiro: async (clinicaId) => {
    if (!clinicaId) return [];

    const agendamentosRef = collection(db, 'agendamentos');
    const q = query(agendamentosRef, where('userId', '==', clinicaId));
    const snapshot = await getDocs(q);

    const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const dadosPorMes = {};
    mesesNomes.forEach(m => dadosPorMes[m] = 0);

    snapshot.forEach(doc => {
      const dados = doc.data();
      if (dados.data && dados.status !== 'cancelado') {
        const data = new Date(dados.data + 'T12:00:00');
        const nomeMes = mesesNomes[data.getMonth()];
        const valor = parseFloat(dados.valor) || 0;
        dadosPorMes[nomeMes] += valor;
      }
    });

    return Object.keys(dadosPorMes).map(mes => ({
      name: mes,
      total: dadosPorMes[mes]
    }));
  },

  // 3. PRÓXIMAS CONSULTAS
  getProximasConsultas: async (clinicaId) => {
    if (!clinicaId) return [];

    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosRef = collection(db, 'agendamentos');
    
    const q = query(
      agendamentosRef, 
      where('userId', '==', clinicaId), 
      where('data', '>=', hoje),
      orderBy('data'), 
      limit(5)
    );
    
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
          const dados = doc.data();
          return {
            id: doc.id,
            paciente: dados.pacienteNome || 'Paciente',
            data: dados.data,
            hora: dados.hora,
            status: dados.status
          };
        });
    } catch (error) {
        console.warn("Erro ao buscar próximas consultas (índice pendente):", error);
        return [];
    }
  }
};