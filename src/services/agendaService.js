import { db } from './firebaseConfig';
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where 
} from 'firebase/firestore';

const dbRef = collection(db, 'agendamentos');

export const agendaService = {
  listar: async (clinicaId) => {
    // 1. Proteção contra ID vazio
    if (!clinicaId) {
        console.warn("AgendaService: Tentativa de listar sem clinicaId!");
        return []; 
    }

    try {
        // 2. A query filtrada (CORRETA)
        const q = query(dbRef, where('userId', '==', clinicaId));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({ 
          ...doc.data(),
          id: doc.id
        }));
    } catch (error) {
        // 3. Log detalhado para te ajudar a debugar
        console.error("Erro no Firebase (Agenda):", error);
        throw error;
    }
  },

  criar: async (dados) => {
    const { id, ...dadosLimpos } = dados;
    // Garante que o userId está sendo salvo!
    if (!dadosLimpos.userId) {
        console.error("Erro: Tentando salvar agendamento sem userId (Dono)!");
        throw new Error("Agendamento sem médico vinculado.");
    }
    await addDoc(dbRef, dadosLimpos);
  },

  atualizar: async (id, dados) => {
    const { id: idIgnorado, ...dadosLimpos } = dados;
    const docRef = doc(db, 'agendamentos', id);
    await updateDoc(docRef, dadosLimpos);
  },

  excluir: async (id) => {
    const docRef = doc(db, 'agendamentos', id);
    await deleteDoc(docRef);
  }
};