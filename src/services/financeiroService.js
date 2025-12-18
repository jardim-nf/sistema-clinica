import { db } from './firebaseConfig';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy 
} from 'firebase/firestore';

const dbRef = collection(db, 'despesas');

export const financeiroService = {
  adicionar: async (dados) => {
    await addDoc(dbRef, dados);
  },

  // CORREÇÃO: Agora exige o userId para filtrar
  listarDespesas: async (userId) => {
    if (!userId) return [];

    // Filtra apenas as despesas deste usuário
    const q = query(
        dbRef, 
        where('userId', '==', userId),
        orderBy('data', 'desc') // Opcional: já ordena por data
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  },

  excluir: async (id) => {
    const docRef = doc(db, 'despesas', id);
    await deleteDoc(docRef);
  }
};