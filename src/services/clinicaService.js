import { db, storage } from './firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const clinicaService = {
  // Faz upload da logo e retorna a URL
  uploadLogo: async (userId, arquivo) => {
    if (!arquivo) throw new Error("Nenhum arquivo enviado.");

    // Salva em: logos/ID_DO_USUARIO/logo.png
    // Usamos um nome fixo 'logo' ou timestamp para evitar lixo no storage
    const storageRef = ref(storage, `logos/${userId}/logo_clinica`);
    
    const snapshot = await uploadBytes(storageRef, arquivo);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Já atualiza o documento do usuário com a nova URL
    const userRef = doc(db, "usuarios", userId);
    await updateDoc(userRef, { logo: downloadURL });

    return downloadURL;
  },

  // Atualiza os outros dados (texto)
  atualizarDados: async (userId, dados) => {
    const userRef = doc(db, "usuarios", userId);
    await updateDoc(userRef, {
        ...dados,
        updatedAt: new Date()
    });
  },

  // Busca dados públicos da clínica para o agendamento online
  getClinicaById: async (userId) => {
    try {
        const userRef = doc(db, "usuarios", userId);
        const { getDoc } = await import('firebase/firestore');
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() };
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar dados da clínica:", error);
        return null;
    }
  }
};