import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { clinicaService } from '../services/clinicaService';

import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  Save, Loader2, Camera, Upload, 
  Users, UserPlus, Trash2, Mail, Lock, 
  Eye, EyeOff, ShieldCheck, 
  CheckCircle, XCircle, AlertCircle,
  FileText, Copy, Building, Stethoscope, 
  Smartphone, Globe, Shield, LogOut, Settings
} from 'lucide-react';

// --- COMPONENTES AUXILIARES ---

const TabButton = ({ id, icon: Icon, label, count, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 flex-1 min-w-0 ${
      activeTab === id
        // MUDANÇA: Tab ativa verde
        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg'
        : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium truncate">{label}</span>
    {count !== undefined && count > 0 && (
      // MUDANÇA: Badge verde claro
      <span className="ml-auto bg-emerald-100 text-emerald-600 text-xs font-bold px-2 py-1 rounded-full">
        {count}
      </span>
    )}
  </button>
);

const ConfigCard = ({ title, icon: Icon, children, color = 'emerald' }) => {
  const colors = {
    // MUDANÇA: Cores ajustadas para a paleta verde
    emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-100',
    teal: 'from-teal-50 to-teal-100/50 border-teal-100',
    green: 'from-green-50 to-green-100/50 border-green-100',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.emerald} rounded-xl border p-6`}>
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Icon size={20} className={`text-${color}-600`} />
        {title}
      </h3>
      {children}
    </div>
  );
};

// Hook de toast local temporário
const useToastLocal = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = React.useCallback(({ message, type = 'info', duration = 3000 }) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
    return id;
  }, []);

  const toast = {
    success: (msg, dur = 3000) => addToast({ message: msg, type: 'success', duration: dur }),
    error: (msg, dur = 3000) => addToast({ message: msg, type: 'error', duration: dur }),
    warning: (msg, dur = 3000) => addToast({ message: msg, type: 'warning', duration: dur }),
    info: (msg, dur = 3000) => addToast({ message: msg, type: 'info', duration: dur })
  };

  const ToastContainer = () => {
    if (toasts.length === 0) return null;
    return (
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${
              t.type === 'success' ? 'bg-emerald-100 text-emerald-700 border-emerald-400' :
              t.type === 'error' ? 'bg-red-100 text-red-700 border-red-400' :
              t.type === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-400' :
              'bg-slate-100 text-slate-700 border-slate-400'
            } border px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-fadeIn`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
              className="ml-4 text-lg font-bold opacity-50 hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  return { toast, ToastContainer };
};

export default function Configuracoes() {
  const { user, userData, logout } = useAuth();
  const { toast, ToastContainer } = useToastLocal();
  
  const [nomeClinica, setNomeClinica] = useState('');
  const [documento, setDocumento] = useState(''); 
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [logoBase64, setLogoBase64] = useState(null);
  const [nomeMedico, setNomeMedico] = useState('');
  const [crm, setCrm] = useState('');
  const [emailClinica, setEmailClinica] = useState('');
  const [siteClinica, setSiteClinica] = useState('');
  const [horarioFuncionamento, setHorarioFuncionamento] = useState('');
  const [sobreClinica, setSobreClinica] = useState('');

  const [listaEquipe, setListaEquipe] = useState([]);
  const [secNome, setSecNome] = useState('');
  const [secEmail, setSecEmail] = useState('');
  const [secSenha, setSecSenha] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingEquipe, setLoadingEquipe] = useState(false);
  const [filtroEquipe, setFiltroEquipe] = useState('todos');

  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "usuarios", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNomeClinica(data.nomeClinica || '');
        setDocumento(data.documento || '');
        setTelefone(data.telefone || '');
        setEndereco(data.endereco || '');
        setLogoBase64(data.logo || null);
        setNomeMedico(data.nomeMedico || '');
        setCrm(data.crm || '');
        setEmailClinica(data.emailClinica || '');
        setSiteClinica(data.siteClinica || '');
        setHorarioFuncionamento(data.horarioFuncionamento || '');
        setSobreClinica(data.sobreClinica || '');
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || userData?.role !== 'admin') return;
    async function loadEquipe() {
      try {
        let q;
        if (filtroEquipe === 'ativos') {
          q = query(collection(db, "usuarios"), where("donoId", "==", user.uid), where("role", "in", ["secretaria", "assistente"]), where("ativo", "==", true));
        } else if (filtroEquipe === 'inativos') {
          q = query(collection(db, "usuarios"), where("donoId", "==", user.uid), where("role", "in", ["secretaria", "assistente"]), where("ativo", "==", false));
        } else {
          q = query(collection(db, "usuarios"), where("donoId", "==", user.uid), where("role", "in", ["secretaria", "assistente"]));
        }
        const snap = await getDocs(q);
        const equipe = snap.docs.map(d => ({ ...d.data(), id: d.id, createdAt: d.data().createdAt?.toDate(), ultimoAcesso: d.data().ultimoAcesso?.toDate() }));
        setListaEquipe(equipe);
      } catch (error) {
        console.error('Erro ao carregar equipe:', error);
        toast.error("Erro ao carregar equipe");
      }
    }
    loadEquipe();
  }, [user, userData, filtroEquipe]);

  const handleCriarSecretaria = async () => {
    if (!secEmail || !secSenha || !secNome) return toast.error("Preencha todos os campos.");
    if (secSenha.length < 6) return toast.error("A senha deve ter no mínimo 6 dígitos.");

    setLoadingEquipe(true);
    let secondaryApp = null;

    try {
      const config = getApp().options; 
      secondaryApp = initializeApp(config, "SecondaryApp_" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, secEmail, secSenha);
      const novoUid = userCredential.user.uid;

      await setDoc(doc(db, "usuarios", novoUid), {
        email: secEmail,
        nome: secNome,
        role: 'secretaria',
        donoId: user.uid,
        createdAt: new Date(),
        ativo: true,
        ultimoAcesso: null
      });

      await signOut(secondaryAuth);
      toast.success("✅ Secretária cadastrada com sucesso!");
      setSecNome(''); setSecEmail(''); setSecSenha('123456');
    } catch (err) {
      console.error("Erro criação secretária:", err);
      let msg = "Erro ao criar conta.";
      if (err.code === 'auth/email-already-in-use') msg = "E-mail já está em uso.";
      else if (err.code === 'auth/invalid-email') msg = "E-mail inválido.";
      else if (err.code === 'auth/weak-password') msg = "Senha fraca.";
      toast.error(msg);
    } finally {
      if (secondaryApp) { try { deleteApp(secondaryApp); } catch(e) { console.warn(e); } }
      setLoadingEquipe(false);
    }
  };

  const handleAlternarStatusSecretaria = async (secretariaId, atualStatus) => {
    try {
      await updateDoc(doc(db, "usuarios", secretariaId), { ativo: !atualStatus, atualizadoEm: new Date() });
      toast.success(`Status ${!atualStatus ? 'ativado' : 'desativado'}!`);
      setFiltroEquipe(prev => prev);
    } catch (error) { toast.error("Erro ao atualizar status."); }
  };

  const handleExcluirSecretaria = async (secretariaId, secretariaNome) => {
    if (window.confirm(`Tem certeza que deseja remover ${secretariaNome}?`)) {
      try {
        await deleteDoc(doc(db, "usuarios", secretariaId));
        toast.success("Membro removido.");
        setFiltroEquipe(prev => prev);
      } catch (error) { toast.error("Erro ao remover."); }
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.includes('image/')) return toast.error("Apenas imagens são permitidas.");
    if (file.size > 1024 * 1024) return toast.error("A imagem deve ter menos de 1MB.");

    setLoadingLogo(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        await clinicaService.atualizarDados(user.uid, { logo: reader.result, logoAtualizadoEm: new Date() });
        toast.success("✅ Logo atualizada!");
      } catch (error) { toast.error("Erro ao salvar logo."); } 
      finally { setLoadingLogo(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.onerror = () => { toast.error("Erro ao ler imagem."); setLoadingLogo(false); };
  };

  const handleSalvarGeral = async () => {
    setLoadingSalvar(true);
    try {
      const dados = { nomeClinica, nomeMedico, crm, documento, telefone, endereco, emailClinica, siteClinica, horarioFuncionamento, sobreClinica, atualizadoEm: new Date() };
      await clinicaService.atualizarDados(user.uid, dados);
      toast.success("✅ Configurações salvas!");
    } catch (e) { toast.error("❌ Erro ao salvar."); } 
    finally { setLoadingSalvar(false); }
  };

  const copiarParaClipboard = (texto, label) => {
    if (!texto) return toast.warning("Nada para copiar");
    navigator.clipboard.writeText(texto).then(() => toast.success(`✅ ${label} copiado!`)).catch(() => toast.error("❌ Erro ao copiar."));
  };

  const gerarRelatorioEquipe = () => {
    const cabecalho = `Relatório da Equipe - ${nomeClinica}\nData: ${new Date().toLocaleDateString('pt-BR')}\nTotal: ${listaEquipe.length}\n\n`;
    const conteudo = listaEquipe.map((m, i) => `${i + 1}. ${m.nome} | ${m.email} | ${m.role} | ${m.ativo !== false ? 'Ativo' : 'Inativo'}`).join('\n');
    const url = URL.createObjectURL(new Blob([cabecalho + conteudo], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `equipe-${new Date().toISOString().split('T')[0]}.txt`; a.click(); URL.revokeObjectURL(url);
    toast.success("✅ Relatório gerado!");
  };

  if (userData?.role === 'secretaria') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Acesso Restrito</h2>
          <p className="text-slate-600 mb-6">Esta área é exclusiva para administradores.</p>
          <button onClick={logout} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg">
            <LogOut size={18} /> Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return (
    // MUDANÇA: Fundo verde suave
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-4 md:p-6">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
            <p className="text-slate-600 mt-1">Gerencie as configurações da sua clínica</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            {/* MUDANÇA: Avatar verde */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{userData?.nome?.charAt(0) || 'A'}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{userData?.nome || 'Administrador'}</p>
              <p className="text-xs text-slate-500">{userData?.role || 'Admin'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-8 max-w-lg">
          <TabButton id="geral" icon={Settings} label="Geral" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton id="equipe" icon={Users} label="Equipe" count={listaEquipe.length} activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <ConfigCard title="Logo da Clínica" icon={Building} color="emerald">
                <div className="relative group mb-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-40 h-40 mx-auto rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center transition-all duration-300 hover:border-emerald-400 hover:shadow-lg">
                    {loadingLogo ? <div className="flex flex-col items-center"><Loader2 className="animate-spin text-emerald-500" size={32} /><span className="mt-2 text-sm text-slate-500">Processando...</span></div> : logoBase64 ? <img src={logoBase64} alt="Logo" className="w-full h-full object-cover" /> : <div className="text-center p-4"><Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" /><p className="text-sm text-slate-500">Clique para adicionar logo</p></div>}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-4"><Upload size={24} /><span className="text-sm font-medium mt-2">Upload da Logo</span></div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={loadingLogo} />
                </div>
              </ConfigCard>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <ConfigCard title="Informações Profissionais" icon={Stethoscope} color="emerald">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-2">Nome Completo *</label><input type="text" value={nomeMedico} onChange={(e) => setNomeMedico(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="Dr. João Silva" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-2">CRM/UF *</label><input type="text" value={crm} onChange={(e) => setCrm(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="123456/SP" /></div>
                </div>
              </ConfigCard>

              <ConfigCard title="Dados da Clínica" icon={Building} color="teal">
                <form onSubmit={(e) => { e.preventDefault(); handleSalvarGeral(); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-2">Nome da Clínica *</label><input type="text" value={nomeClinica} onChange={(e) => setNomeClinica(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="Clínica Sanus" required /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-2">CNPJ/CPF *</label><input type="text" value={documento} onChange={(e) => setDocumento(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="00.000.000/0001-00" required /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp *</label><div className="relative"><Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="(11) 99999-9999" required /></div></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-2">E-mail Institucional</label><div className="relative"><Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><input type="email" value={emailClinica} onChange={(e) => setEmailClinica(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="contato@clinica.com" /></div></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-2">Site</label><div className="relative"><Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><input type="url" value={siteClinica} onChange={(e) => setSiteClinica(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="https://www.sua-clinica.com" /></div></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-2">Horário de Funcionamento</label><input type="text" value={horarioFuncionamento} onChange={(e) => setHorarioFuncionamento(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="Seg-Sex: 8h às 18h" /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">Endereço Completo *</label><textarea rows="3" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none" placeholder="Endereço da clínica..." required /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">Sobre a Clínica</label><textarea rows="4" value={sobreClinica} onChange={(e) => setSobreClinica(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none" placeholder="Breve descrição..." /></div>
                  </div>
                </form>
              </ConfigCard>

              <div className="flex justify-end">
                {/* MUDANÇA: Botão salvar verde */}
                <button onClick={handleSalvarGeral} disabled={loadingSalvar} className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
                  {loadingSalvar ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {loadingSalvar ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equipe' && (
          <div className="space-y-6">
            <ConfigCard title="Gerenciar Equipe" icon={Users} color="green">
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div><h3 className="text-lg font-semibold text-slate-900">Novo Membro da Equipe</h3><p className="text-slate-600 text-sm">Adicione secretárias ou assistentes</p></div>
                  <div className="flex items-center gap-2">
                    <button onClick={gerarRelatorioEquipe} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition flex items-center gap-2"><FileText size={18} /> Exportar</button>
                    <select value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"><option value="todos">Todos os membros</option><option value="ativos">Ativos</option><option value="inativos">Inativos</option></select>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleCriarSecretaria(); }}>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div><label className="block text-sm font-medium text-slate-700 mb-2">Nome Completo *</label><input type="text" value={secNome} onChange={(e) => setSecNome(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="Maria Silva" required /></div>
                      <div><label className="block text-sm font-medium text-slate-700 mb-2">E-mail de Acesso *</label><div className="relative"><Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><input type="email" value={secEmail} onChange={(e) => setSecEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="maria@clinica.com" required /></div></div>
                      <div><label className="block text-sm font-medium text-slate-700 mb-2">Senha Inicial *</label><div className="relative"><Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} /><input type={showPassword ? "text" : "password"} value={secSenha} onChange={(e) => setSecSenha(e.target.value)} className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-mono" placeholder="••••••" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p></div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                      <div className="text-sm text-slate-600"><p className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-500" /> A senha será entregue ao novo membro para o primeiro acesso</p></div>
                      {/* MUDANÇA: Botão criar conta verde */}
                      <button type="submit" disabled={loadingEquipe} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">{loadingEquipe ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />} {loadingEquipe ? 'Criando Conta...' : 'Criar Nova Conta'}</button>
                    </div>
                  </div>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Equipe ({listaEquipe.length} membros)</h3>
                {listaEquipe.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-dashed border-slate-300"><Users className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h4 className="text-xl font-medium text-slate-600 mb-2">Nenhum membro na equipe</h4><p className="text-slate-500 mb-6 max-w-md mx-auto">Adicione sua primeira secretária ou assistente.</p></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listaEquipe.map((membro) => (
                      <div key={membro.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${membro.ativo !== false ? 'bg-gradient-to-br from-emerald-100 to-emerald-200' : 'bg-gradient-to-br from-slate-100 to-slate-200'}`}>
                              <span className={`font-bold text-lg ${membro.ativo !== false ? 'text-emerald-600' : 'text-slate-400'}`}>{membro.nome?.charAt(0)?.toUpperCase() || 'S'}</span>
                            </div>
                            {membro.ativo !== false && <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"><CheckCircle size={10} className="text-white" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0"><h4 className="font-semibold text-slate-900 truncate">{membro.nome || 'Secretária'}</h4><p className="text-sm text-slate-600 truncate flex items-center gap-1"><Mail size={14} /> {membro.email}</p></div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => handleAlternarStatusSecretaria(membro.id, membro.ativo !== false)} className={`p-2 rounded-lg transition ${membro.ativo !== false ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title={membro.ativo !== false ? 'Desativar' : 'Ativar'}>{membro.ativo !== false ? <CheckCircle size={16} /> : <XCircle size={16} />}</button>
                                <button onClick={() => copiarParaClipboard(membro.email, 'E-mail copiado')} className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition" title="Copiar e-mail"><Copy size={16} /></button>
                                <button onClick={() => handleExcluirSecretaria(membro.id, membro.nome)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition" title="Remover permanentemente"><Trash2 size={16} /></button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">{membro.role === 'secretaria' ? 'Secretária' : 'Assistente'}</span>
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">{membro.createdAt?.toLocaleDateString('pt-BR') || 'Data não disponível'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ConfigCard>
          </div>
        )}
      </div>

      <div className="mt-12 pt-8 border-t border-slate-200">
        <div className="text-center text-sm text-slate-500">
          <p>Sanus v2.0 • Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          <p className="mt-1">© {new Date().getFullYear()} Todos os direitos reservados</p>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}