import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- ATENÇÃO: Substitua os valores abaixo pelos que você copiou do Console ---
const firebaseConfig = {
  // A chave tem que estar entre aspas, ex: "AIzaSyB..."
  // NÃO use import.meta.env agora, cole o texto real para testar
  apiKey: "AIzaSyDhItg1hrxVlx7bWD0KDK5XVSfxCnKe0qk", 
  
  authDomain: "sistema-clinica-1bc70.firebaseapp.com",
  projectId: "sistema-clinica-1bc70",
  storageBucket: "sistema-clinica-1bc70.firebasestorage.app", 
  messagingSenderId: "SEU_SENDER_ID_REAL",
  appId: "SEU_APP_ID_REAL"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;