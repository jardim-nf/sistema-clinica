import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  sendPasswordResetEmail // <--- IMPORTAÇÃO ADICIONADA
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- FUNÇÃO DE LOGIN ---
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // --- FUNÇÃO DE LOGOUT ---
  function logout() {
    console.log("DEBUG: Iniciando logout.");
    setUserData(null);
    return signOut(auth);
  }

  // --- FUNÇÃO DE CADASTRO ---
  async function signup(email, password, nome, role = 'admin') {
    console.log("Iniciando cadastro no Firebase...");
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = result.user;

        await updateProfile(newUser, { displayName: nome });

        await setDoc(doc(db, 'usuarios', newUser.uid), {
          nome: nome,
          email: email,
          role: role, 
          donoId: role === 'admin' ? null : 'PENDENTE',
          nomeClinica: role === 'admin' ? nome : null, 
          createdAt: new Date().toISOString()
        });

        console.log("Cadastro finalizado com sucesso!");
        return newUser;
    } catch (error) {
        console.error("ERRO NO SIGNUP:", error);
        throw error;
    }
  }

  // --- FUNÇÃO DE RESETAR SENHA (NOVA) ---
  function resetPassword(email) {
    console.log("DEBUG: Solicitando reset de senha para:", email);
    return sendPasswordResetEmail(auth, email);
  }

  // --- MONITORAR USUÁRIO LOGADO ---
  useEffect(() => {
    console.log("DEBUG: AuthContext useEffect iniciado.");
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      console.log(`DEBUG: onAuthStateChanged - Usuário: ${currentUser ? 'Logado' : 'Deslogado'}`);

      try {
        if (currentUser) {
          console.log(`DEBUG: Buscando dados do Firestore para UID: ${currentUser.uid}`);
          const docRef = doc(db, 'usuarios', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const dados = docSnap.data();
            
            let idClinica;
            
            // Lógica do SUPER_ADMIN
            if (dados.role === 'super_admin') {
               idClinica = 'GLOBAL_ADMIN'; 
               if (!dados.nomeClinica) {
                   dados.nomeClinica = 'Sistema Master'; 
               }
               console.log("DEBUG: Usuário SUPER_ADMIN identificado.");
               
            } else if (dados.role === 'admin') {
               idClinica = currentUser.uid;
            } else { // secretaria
               idClinica = dados.donoId || currentUser.uid;
            }

            setUserData({
              ...dados,
              uid: currentUser.uid,
              clinicaId: idClinica
            });
            console.log(`DEBUG: UserData carregado. Role: ${dados.role}`);
          } else {
              console.warn(`WARN: Documento de usuário não encontrado para UID: ${currentUser.uid}`);
          }
        } else {
          setUserData(null);
          console.log("DEBUG: Usuário deslogado. UserData limpo.");
        }
      } catch (error) {
          console.error("ERRO FATAL NO CARREGAMENTO (DENTRO DO TRY):", error);
      } finally {
        setLoading(false); 
        console.log("DEBUG: setLoading(false) CHAMADO.");
      }
    });

    return unsubscribe;
  }, []);

  // Adicionamos resetPassword ao value
  const value = { user, userData, signup, login, logout, resetPassword };

  return (
    <AuthContext.Provider value={value}>
      {
        loading ? 
        <div className="h-screen flex items-center justify-center text-blue-600 font-bold">Carregando sistema...</div> 
        : 
        children
      }
    </AuthContext.Provider>
  );
}