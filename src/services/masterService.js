// src/services/masterService.js - VERSÃO FINAL COMPLETA COM TODAS AS EXPORTAÇÕES

import { db } from './firebaseConfig';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    doc, 
    updateDoc,
    setDoc, 
} from 'firebase/firestore';

const USUARIOS_COLLECTION = 'usuarios';
const MENSALIDADES_COLLECTION = 'mensalidades'; 
const AGENDAMENTOS_COLLECTION = 'agendamentosGlobais'; 
const DATA_INICIO_SISTEMA = new Date(2026, 0, 1); // Janeiro de 2026 (Mês 0)

// --- FUNÇÕES ESSENCIAIS DE USUÁRIO/CLÍNICA ---

export async function getClinicas() {
    try {
        const q = query(collection(db, USUARIOS_COLLECTION), where('role', '==', 'admin'));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Erro ao buscar clínicas:", error);
        throw new Error("Não foi possível carregar a lista de clínicas.");
    }
}

export async function updateClinicaFinanceiro(clinicaId, data) {
    try {
        const docRef = doc(db, USUARIOS_COLLECTION, clinicaId);
        await updateDoc(docRef, data);
        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar financeiro da clínica:", error);
        throw new Error("Não foi possível atualizar o financeiro da clínica.");
    }
}

/**
 * Altera o status de bloqueio de acesso da clínica (usado em Clinicas.jsx).
 */
export async function toggleClinicaBlockStatus(clinicaId, isBlocked) {
    try {
        const docRef = doc(db, USUARIOS_COLLECTION, clinicaId);
        await updateDoc(docRef, { isBlocked: isBlocked });
        return { success: true };
    } catch (error) {
        console.error("Erro ao alterar status de bloqueio da clínica:", error);
        throw new Error("Não foi possível alterar o status de bloqueio.");
    }
}

// --- FUNÇÕES DE CONTROLE MASTER (AGENDAMENTOS) ---

/**
 * Busca todos os agendamentos na coleção global (usado em ControleMaster.jsx).
 */
export async function getGlobalAppointments() {
    try {
        const q = query(collection(db, AGENDAMENTOS_COLLECTION));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Erro ao buscar agendamentos globais:", error);
        return []; 
    }
}


// --- FUNÇÕES DE ARMAZENAMENTO (SIMULADAS) ---

export async function uploadComprovante(file, clinicaId, mesReferencia) {
    console.log(`[STORAGE SIMULADO] Tentativa de upload para ${clinicaId}/${mesReferencia}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    const fileName = file.name;
    const url = `gs://comprovantes/${clinicaId}/${mesReferencia}/${fileName}`; 
    
    console.log(`[STORAGE SIMULADO] Upload concluído. URL: ${url}`);
    return { url, fileName };
}

export async function deleteComprovante(url) {
    console.log(`[STORAGE SIMULADO] Removendo arquivo: ${url}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[STORAGE SIMULADO] Remoção bem-sucedida.`);
    return { success: true };
}


// --- FUNÇÕES DE PAGAMENTO MENSAL (Firestore) ---

export async function registerMonthlyPayment(clinicaId, referenciaMesAno, data) {
    try {
        const docId = `${clinicaId}_${referenciaMesAno}`;
        const docRef = doc(db, MENSALIDADES_COLLECTION, docId);

        await setDoc(docRef, {
            ...data,
            clinicaId: clinicaId,
            referenciaMesAno: referenciaMesAno,
            dataRegistro: new Date()
        }, { merge: true });

        return { success: true };

    } catch (error) {
        console.error("Erro ao registrar pagamento mensal:", error);
        throw new Error("Não foi possível registrar o pagamento mensal.");
    }
}

export async function getClinicaHistory(clinicaId) {
    try {
        const q = query(
            collection(db, MENSALIDADES_COLLECTION),
            where('clinicaId', '==', clinicaId)
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

    } catch (error) {
        console.error(`Erro ao buscar histórico da clínica ${clinicaId}:`, error);
        throw new Error("Não foi possível carregar o histórico de pagamentos.");
    }
}

// --- FUNÇÕES DE SIMULAÇÃO DE DADOS PARA GRÁFICOS ---

/**
 * Simula dados de histórico de faturamento e status de clínicas para gráficos.
 * @returns {object} Dados para Gráfico de Linha (Faturamento) e Gráfico de Pizza (Status).
 */
export async function getRelatorioSocietarioData() {
    console.log("[MOCK] Gerando dados para Relatórios Societários.");
    await new Promise(resolve => setTimeout(resolve, 500)); 

    // Dados de 12 meses (simulados) para Gráfico de Linha
    const faturamentoHistorico = [];
    const baseRevenue = 60000;
    
    // Simula 12 meses a partir de Dezembro/2025
    for (let i = 0; i < 12; i++) {
        const date = new Date(2025, 11 + i, 1);
        const monthYear = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        
        faturamentoHistorico.push({
            mes: monthYear,
            faturamentoEstimado: baseRevenue + Math.floor(Math.random() * 15000), 
            faturamentoReal: (baseRevenue + Math.floor(Math.random() * 10000)) * (0.85 + Math.random() * 0.15), 
        });
    }

    // Dados de status atual para Gráfico de Pizza
    const statusAtual = [
        { name: 'Pagas em Dia', value: 35, color: '#4CAF50' }, // Verde
        { name: 'Inadimplentes (Curto Prazo)', value: 10, color: '#FF9800' }, // Laranja
        { name: 'Bloqueadas/Inativas', value: 5, color: '#F44336' }, // Vermelho
        { name: 'Novos Contratos', value: 4, color: '#2196F3' }, // Azul
    ];

    return {
        faturamentoHistorico,
        statusAtual,
    };
}


// --- FUNÇÃO DE RESUMO GLOBAL (Verifica data de início) ---

export async function getGlobalFinanceSummary() {
    try {
        const hoje = new Date();
        
        if (hoje < DATA_INICIO_SISTEMA) {
             return {
                totalClinicas: (await getClinicas()).length,
                clinicasPagas: 0,
                clinicasInadimplentes: 0,
                faturamentoMensal: 0,
                timestamp: hoje.toISOString()
            };
        }
        
        const todasClinicas = await getClinicas();
        const totalClinicas = todasClinicas.length;
        
        const clinicasPagas = todasClinicas.filter(c => (c.valorMensalidade || 2500) > 2500).length;
        const clinicasInadimplentes = totalClinicas - clinicasPagas;

        const faturamentoMensal = todasClinicas.reduce((sum, clinica) => {
            const valor = (clinica.valorMensalidade || 2500); 
            return sum + valor;
        }, 0); 
        
        return {
            totalClinicas,
            clinicasPagas,
            clinicasInadimplentes,
            faturamentoMensal,
            timestamp: hoje.toISOString()
        };

    } catch (error) {
        console.error("Erro ao gerar resumo financeiro global:", error);
        throw new Error("Não foi possível gerar o resumo financeiro.");
    }
}