// src/services/prontuarioService.js
import { db, storage } from './firebaseConfig';
import { 
  collection, addDoc, getDocs, query, where, deleteDoc, doc, orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const COLLECTION_EVOLUCAO = "prontuarios"; 
const COLLECTION_ANEXOS = "anexos_paciente"; 

export const prontuarioService = {
  // --- 1. EVOLUÇÕES, ATESTADOS E DECLARAÇÕES (TEXTO) ---
  listarEvolucoes: async (pacienteId, userId) => {
    if (!pacienteId || !userId) return []; 

    const q = query(
        collection(db, COLLECTION_EVOLUCAO), 
        where("userId", "==", userId),
        where("pacienteId", "==", pacienteId),
        orderBy("data", "desc") // Ordenação centralizada no campo 'data' para a Timeline
    );
    
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  salvarEvolucao: async (dados) => {
    // Padroniza o campo 'data' para garantir que a Timeline ordene corretamente
    return await addDoc(collection(db, COLLECTION_EVOLUCAO), {
        ...dados,
        data: new Date() 
    });
  },

  excluirEvolucao: async (id) => {
    return await deleteDoc(doc(db, COLLECTION_EVOLUCAO, id));
  },

  // --- 2. ANEXOS E PDFS (ARQUIVOS) ---
  listarAnexos: async (pacienteId, userId) => {
    if (!pacienteId || !userId) return []; 

    const q = query(
        collection(db, COLLECTION_ANEXOS), 
        where("userId", "==", userId),
        where("pacienteId", "==", pacienteId)
    );
    
    const snap = await getDocs(q);
    const lista = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    
    // Ordenação manual por 'data' (padronizado)
    return lista.sort((a,b) => {
        const dateA = a.data?.seconds || 0;
        const dateB = b.data?.seconds || 0;
        return dateB - dateA;
    });
  },

  uploadAnexo: async (arquivo, pacienteId, nomeDescritivo, userId) => {
    if (!arquivo) throw new Error("Nenhum arquivo enviado.");
    
    const storageRef = ref(storage, `pacientes/${pacienteId}/${Date.now()}_${arquivo.name}`);
    const snapshot = await uploadBytes(storageRef, arquivo);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return await addDoc(collection(db, COLLECTION_ANEXOS), {
        userId,
        pacienteId,
        nome: nomeDescritivo || arquivo.name,
        tipo: arquivo.type,
        url: downloadURL,
        path: snapshot.ref.fullPath,
        data: new Date() // Padronizado para 'data' em vez de dataCriacao
    });
  },

  excluirAnexo: async (id, pathStorage) => {
    const fileRef = ref(storage, pathStorage);
    await deleteObject(fileRef).catch(err => console.error("Erro ao deletar arquivo físico", err));
    await deleteDoc(doc(db, COLLECTION_ANEXOS, id));
  }
};