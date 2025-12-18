import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebaseConfig';
import { clinicaService } from '../services/clinicaService';
import { doc, onSnapshot, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApp, deleteApp } from 'firebase/app'; // <--- Necessário para criar conta sem deslogar
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  User, Building, QrCode, MapPin, Phone, Save, Loader2, Camera, 
  Stethoscope, Hash, Users, UserPlus, Trash2, Mail, Lock, KeyRound 
} from 'lucide-react';

export default function Configuracoes() {
  const { user, userData } = useAuth();
  const { addToast } = useToast();
  
  // --- ESTADOS: DADOS GERAIS ---
  const [nomeClinica, setNomeClinica] = useState('');
  const [documento, setDocumento] = useState(''); 
  const [telefone, setTelefone] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [endereco, setEndereco] = useState('');
  const [logoBase64, setLogoBase64] = useState(null);
  const [nomeMedico, setNomeMedico] = useState('');
  const [crm, setCrm] = useState('');

  // --- ESTADOS: GESTÃO DE EQUIPE (SECRETÁRIAS) ---
  const [listaEquipe, setListaEquipe] = useState([]);
  
  // Formulário de Cadastro da Secretária
  const [secNome, setSecNome] = useState('');
  const [secEmail, setSecEmail] = useState('');
  const [secSenha, setSecSenha] = useState('123456'); // Senha padrão sugerida
  const [loadingEquipe, setLoadingEquipe] = useState(false);

  // --- LOADING STATES ---
  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [loadingLogo, setLoadingLogo] = useState(false);

  // 1. CARREGAR DADOS GERAIS
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "usuarios", user.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setNomeClinica(data.nomeClinica || '');
            setDocumento(data.documento || '');
            setTelefone(data.telefone || '');
            setChavePix(data.chavePix || '');
            setEndereco(data.endereco || '');
            setLogoBase64(data.logo || null);
            setNomeMedico(data.nomeMedico || '');
            setCrm(data.crm || '');
        }
    });
    return () => unsubscribe();
  }, [user]);

  // 2. CARREGAR EQUIPE (Lista usuários que são secretárias deste médico)
  useEffect(() => {
      if(!user || userData?.role !== 'admin') return;
      
      async function loadEquipe() {
          // Busca usuários onde o donoId é o ID do médico logado e role é secretaria
          const q = query(collection(db, "usuarios"), where("donoId", "==", user.uid), where("role", "==", "secretaria"));
          const snap = await getDocs(q);
          setListaEquipe(snap.docs.map(d => ({...d.data(), id: d.id})));
      }
      loadEquipe();
  }, [user, userData, loadingEquipe]);

  // --- FUNÇÃO PODEROSA: CRIAR CONTA SEM DESLOGAR ---
  const handleCriarSecretaria = async () => {
      if(!secEmail || !secSenha || !secNome) return addToast({message: "Preencha todos os campos da secretária.", type: "error"});
      if(secSenha.length < 6) return addToast({message: "A senha deve ter no mínimo 6 dígitos.", type: "error"});

      setLoadingEquipe(true);
      let secondaryApp = null;

      try {
          // 1. Cria uma instância secundária do Firebase (para não deslogar o Médico)
          const config = getApp().options; 
          secondaryApp = initializeApp(config, "SecondaryApp");
          const secondaryAuth = getAuth(secondaryApp);

          // 2. Cria o usuário na autenticação
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, secEmail, secSenha);
          const novoUid = userCredential.user.uid;

          // 3. Salva os dados no Firestore (Vinculando ao Médico)
          await setDoc(doc(db, "usuarios", novoUid), {
              email: secEmail,
              nome: secNome,
              role: 'secretaria',
              donoId: user.uid, // <--- VINCULA AO MÉDICO AQUI
              createdAt: new Date()
          });

          // 4. Limpa a sessão secundária e o formulário
          await signOut(secondaryAuth);
          addToast({ message: "Secretária cadastrada com sucesso!", type: "success" });
          
          setSecNome('');
          setSecEmail('');
          setSecSenha('123456'); // Reseta para o padrão
          
      } catch (err) {
          console.error(err);
          if(err.code === 'auth/email-already-in-use') {
              addToast({ message: "Este e-mail já está sendo usado.", type: "error" });
          } else {
              addToast({ message: "Erro ao criar conta.", type: "error" });
          }
      } finally {
          // Destroi a instância secundária para liberar memória
          if (secondaryApp) deleteApp(secondaryApp);
          setLoadingEquipe(false);
      }
  };

  const handleExcluirSecretaria = async (secretariaId) => {
      // Nota: Deletar do Auth via client-side é bloqueado por segurança sem login recente da pessoa.
      // Aqui vamos apenas "desativar" o acesso no Banco de Dados. Ela não conseguirá ver nada.
      if(window.confirm("Bloquear o acesso desta secretária?")) {
          try {
              // Podemos deletar o doc ou mudar a role para 'bloqueado'
              // Vamos deletar o documento do usuário para simplificar
              await deleteDoc(doc(db, "usuarios", secretariaId));
              setLoadingEquipe(curr => !curr);
              addToast({ message: "Acesso removido.", type: "success" });
          } catch (error) {
              addToast({ message: "Erro ao remover.", type: "error" });
          }
      }
  };

  // --- OUTROS HANDLERS (Igual anterior) ---
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) return addToast({ message: "Máximo 500KB.", type: "error" });

    setLoadingLogo(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        try {
            await clinicaService.atualizarDados(user.uid, { logo: reader.result });
            addToast({ message: "Logo salva!", type: "success" });
        } catch (error) { addToast({ message: "Erro.", type: "error" }); } 
        finally { setLoadingLogo(false); }
    };
  };

  const handleSalvar = async () => {
    setLoadingSalvar(true);
    try {
      await clinicaService.atualizarDados(user.uid, { nomeClinica, nomeMedico, crm, documento, telefone, chavePix, endereco });
      addToast({ message: "Salvo!", type: "success" });
    } catch (e) { addToast({ message: "Erro.", type: "error" }); } finally { setLoadingSalvar(false); }
  };

  if (userData?.role === 'secretaria') return <div className="p-10 text-center text-slate-400">Acesso Restrito.</div>;

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Configurações Gerais</h1>
      
      {/* --- GESTÃO DE EQUIPE (CADASTRO DIRETO) --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 border-l-4 border-l-purple-500">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Users size={20} className="text-purple-600"/> Gestão de Equipe
          </h2>
          <p className="text-sm text-slate-500 mb-6">
              Crie a conta da secretária aqui. Você define o e-mail e a senha, e entrega os dados para ela acessar.
          </p>
          
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><UserPlus size={16}/> Novo Cadastro</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                      <input type="text" placeholder="Nome da Secretária" className="w-full border p-3 rounded-lg outline-none bg-white"
                          value={secNome} onChange={e=>setSecNome(e.target.value)} />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1">E-mail de Login</label>
                      <input type="email" placeholder="secretaria@clinica.com" className="w-full border p-3 rounded-lg outline-none bg-white"
                          value={secEmail} onChange={e=>setSecEmail(e.target.value)} />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1">Senha de Acesso</label>
                      <div className="relative">
                          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                          <input type="text" placeholder="Senha" className="w-full border pl-10 p-3 rounded-lg outline-none bg-white font-mono"
                              value={secSenha} onChange={e=>setSecSenha(e.target.value)} />
                      </div>
                  </div>
              </div>
              <button 
                  onClick={handleCriarSecretaria} 
                  disabled={loadingEquipe}
                  className="mt-4 bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
              >
                  {loadingEquipe ? <Loader2 className="animate-spin"/> : 'Criar Conta Agora'}
              </button>
          </div>

          <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-2">Equipe Ativa</h3>
              {listaEquipe.map(membro => (
                  <div key={membro.id} className="flex flex-col md:flex-row justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm gap-3">
                      <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                              {membro.nome ? membro.nome.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{membro.nome || 'Secretária'}</span>
                              <span className="text-xs text-slate-500">{membro.email}</span>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full md:w-auto">
                          <div className="bg-slate-100 px-3 py-1 rounded text-xs text-slate-500 flex items-center gap-1">
                             <KeyRound size={12}/> Senha definida
                          </div>
                          <button 
                              onClick={() => handleExcluirSecretaria(membro.id)} 
                              className="p-2 text-red-400 hover:text-white hover:bg-red-500 rounded transition border border-red-100"
                              title="Remover Acesso"
                          >
                              <Trash2 size={16}/>
                          </button>
                      </div>
                  </div>
              ))}
              {listaEquipe.length === 0 && <p className="text-slate-400 text-sm italic py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">Nenhum membro cadastrado.</p>}
          </div>
      </div>

      {/* --- FORMULÁRIO DE DADOS GERAIS (MÉDICO E CLÍNICA) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <div className="relative group mb-4">
                    <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center relative">
                        {loadingLogo ? <Loader2 className="animate-spin text-blue-500" size={32}/> : logoBase64 ? <img src={logoBase64} alt="Logo" className="w-full h-full object-cover" /> : <Building size={40} className="text-slate-300" />}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer"><Camera className="text-white" size={24}/></div>
                    </div>
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleLogoChange} disabled={loadingLogo} />
                </div>
                <h2 className="font-bold text-lg text-slate-800">Logo da Clínica</h2>
            </div>
        </div>

        <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="mb-8">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Stethoscope size={20} className="text-blue-600"/> Profissional</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Completo</label><input type="text" className="w-full pl-3 pr-3 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500" value={nomeMedico} onChange={(e) => setNomeMedico(e.target.value)} /></div>
                        <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CRM</label><input type="text" className="w-full pl-3 pr-3 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500" value={crm} onChange={(e) => setCrm(e.target.value)} /></div>
                    </div>
                </div>

                <div>
                    <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Building size={20} className="text-blue-600"/> Clínica</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Fantasia</label><input type="text" className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:border-blue-500" value={nomeClinica} onChange={(e) => setNomeClinica(e.target.value)} /></div>
                        <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CNPJ / CPF</label><input type="text" className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:border-blue-500" value={documento} onChange={(e) => setDocumento(e.target.value)} /></div>
                        <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">WhatsApp</label><input type="text" className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:border-blue-500" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
                        <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Chave PIX</label><input type="text" className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:border-blue-500" value={chavePix} onChange={(e) => setChavePix(e.target.value)} /></div>
                        <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Endereço</label><textarea rows="3" className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:border-blue-500 resize-none" value={endereco} onChange={(e) => setEndereco(e.target.value)} /></div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSalvar} disabled={loadingSalvar} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">{loadingSalvar ? <Loader2 className="animate-spin"/> : 'Salvar Alterações'}</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}