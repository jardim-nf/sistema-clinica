import { db } from './firebaseConfig';
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where 
} from 'firebase/firestore';

const dbRef = collection(db, 'medicos');

export const medicoService = {
  listar: async (clinicaId) => {
    if (!clinicaId) return [];
    try {
        const q = query(dbRef, where('clinicaId', '==', clinicaId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ 
          ...doc.data(),
          id: doc.id
        }));
    } catch (error) {
        console.error("Erro ao listar médicos:", error);
        throw error;
    }
  },

  criar: async (dados) => {
    await addDoc(dbRef, {
        ...dados,
        createdAt: new Date().toISOString()
    });
  },

  atualizar: async (id, dados) => {
    const docRef = doc(db, 'medicos', id);
    await updateDoc(docRef, {
        ...dados,
        updatedAt: new Date().toISOString()
    });
  },

  excluir: async (id) => {
    const docRef = doc(db, 'medicos', id);
    await deleteDoc(docRef);
  }
};