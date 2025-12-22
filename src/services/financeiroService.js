import { db } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  doc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

const dbRef = collection(db, 'despesas');

export const financeiroService = {
  
  // --- 1. ADICIONAR (CREATE) ---
  // Recebe os dados da despesa e o ID do usuário para vincular
  adicionar: async (dados, userId) => {
    if (!userId) throw new Error("Erro: Usuário não identificado ao tentar salvar despesa.");

    try {
      await addDoc(dbRef, {
        ...dados,
        userId: userId, // Garante o vínculo
        createdAt: new Date().toISOString() // Data de criação para auditoria
      });
    } catch (error) {
      console.error("Erro ao adicionar despesa:", error);
      throw error;
    }
  },

  // --- 2. LISTAR (READ) ---
  // Busca apenas as despesas do usuário logado
  listarDespesas: async (userId) => {
    if (!userId) return [];

    try {
      const q = query(
        dbRef, 
        where('userId', '==', userId),
        orderBy('data', 'desc') // Ordena pela data da despesa (mais recente primeiro)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
    } catch (error) {
      console.error("Erro ao listar despesas:", error);
      
      // DICA DE OURO: Se der erro de índice no console
      if (error.code === 'failed-precondition') {
        console.warn("Falta criar o índice composto no Firebase! Verifique o link no console.");
      }
      throw error;
    }
  },

  // --- 3. ATUALIZAR (UPDATE) ---
  // Permite editar uma despesa existente
  atualizar: async (id, novosDados) => {
    try {
      const docRef = doc(db, 'despesas', id);
      await updateDoc(docRef, novosDados);
    } catch (error) {
      console.error("Erro ao atualizar despesa:", error);
      throw error;
    }
  },

  // --- 4. EXCLUIR (DELETE) ---
  excluir: async (id) => {
    try {
      const docRef = doc(db, 'despesas', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Erro ao excluir despesa:", error);
      throw error;
    }
  }
};