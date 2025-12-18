// src/services/pacienteService.js
import { db } from './firebaseConfig';
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy 
} from 'firebase/firestore';

const dbRef = collection(db, 'pacientes');

export const pacienteService = {
  // 1. Busca por CPF para garantir unicidade
  buscarPorCPF: async (estabelecimentoId, cpf) => {
    if (!estabelecimentoId || !cpf) return null;
    const cpfLimpo = cpf.replace(/\D/g, ''); 
    if (cpfLimpo.length !== 11) return null;
    
    const q = query(
      dbRef, 
      where('userId', '==', estabelecimentoId),
      where('cpf', '==', cpfLimpo)
    );
    
    const snap = await getDocs(q, { source: 'server' }); 
    if (snap.docs.length > 0) {
      const doc = snap.docs[0];
      return { ...doc.data(), id: doc.id };
    }
    return null;
  },
  
  // 2. Listagem completa para a clínica
  listar: async (userId) => { 
     if (!userId) return [];
     const q = query(dbRef, where('userId', '==', userId), orderBy('nome')); 
     const snap = await getDocs(q, { source: 'server' }); 
     return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  // 3. Criar novo paciente
  criar: async (dados) => {
    const { id, ...dadosLimpos } = dados;
    if (dadosLimpos.cpf) {
        dadosLimpos.cpf = dadosLimpos.cpf.replace(/\D/g, '');
    }
    return await addDoc(dbRef, dadosLimpos);
  },

  // 4. Atualizar dados
  atualizar: async (id, dados) => {
    const { id: idIgnorado, ...dadosLimpos } = dados; 
    if (dadosLimpos.cpf) {
        dadosLimpos.cpf = dadosLimpos.cpf.replace(/\D/g, '');
    }
    const docRef = doc(db, 'pacientes', id);
    return await updateDoc(docRef, dadosLimpos);
  },

  // 5. Excluir registro
  excluir: async (id) => {
    if (!id) throw new Error("ID inválido");
    const docRef = doc(db, 'pacientes', id);
    return await deleteDoc(docRef);
  }
};