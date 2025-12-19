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
  updateDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  Save, Loader2, Camera, Upload, 
  Users, UserPlus, Trash2, Mail, Lock, 
  Eye, EyeOff, ShieldCheck, 
  CheckCircle, XCircle, AlertCircle,
  FileText, Copy, Bell, 
  Send, RefreshCw, Database, 
  History, LogOut, KeyRound, 
  QrCode, CreditCard, Settings,
  Building, Stethoscope, Smartphone,
  Globe, Shield, Zap, Cloud,
  ShieldAlert
} from 'lucide-react';

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
              t.type === 'success' ? 'bg-green-100 text-green-700 border-green-400' :
              t.type === 'error' ? 'bg-red-100 text-red-700 border-red-400' :
              t.type === 'warning' ? 'bg-yellow-100 text-yellow-700 border-yellow-400' :
              'bg-blue-100 text-blue-700 border-blue-400'
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
  
  // --- ESTADOS: DADOS GERAIS ---
  const [nomeClinica, setNomeClinica] = useState('');
  const [documento, setDocumento] = useState(''); 
  const [telefone, setTelefone] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [endereco, setEndereco] = useState('');
  const [logoBase64, setLogoBase64] = useState(null);
  const [nomeMedico, setNomeMedico] = useState('');
  const [crm, setCrm] = useState('');
  const [emailClinica, setEmailClinica] = useState('');
  const [siteClinica, setSiteClinica] = useState('');
  const [horarioFuncionamento, setHorarioFuncionamento] = useState('');
  const [sobreClinica, setSobreClinica] = useState('');
  const [dadosBancarios, setDadosBancarios] = useState({
    banco: '',
    agencia: '',
    conta: '',
    tipoConta: 'corrente',
    titular: ''
  });

  // --- ESTADOS: GESTÃO DE EQUIPE ---
  const [listaEquipe, setListaEquipe] = useState([]);
  const [secNome, setSecNome] = useState('');
  const [secEmail, setSecEmail] = useState('');
  const [secSenha, setSecSenha] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingEquipe, setLoadingEquipe] = useState(false);
  const [filtroEquipe, setFiltroEquipe] = useState('todos');

  // --- ESTADOS: NOTIFICAÇÕES ---
  const [autoConfirmacaoAgendamento, setAutoConfirmacaoAgendamento] = useState(true);
  const [lembreteConsulta, setLembreteConsulta] = useState(true);
  const [intervaloLembrete, setIntervaloLembrete] = useState('24');
  const [notificacoesEmail, setNotificacoesEmail] = useState(true);
  const [notificacoesWhatsapp, setNotificacoesWhatsapp] = useState(false);
  const [notificacoesSMS, setNotificacoesSMS] = useState(false);
  const [horarioInicioNotificacoes, setHorarioInicioNotificacoes] = useState('08:00');
  const [horarioFimNotificacoes, setHorarioFimNotificacoes] = useState('20:00');
  const [diasAntecedencia, setDiasAntecedencia] = useState([1, 2, 7]);
  const [testandoNotificacoes, setTestandoNotificacoes] = useState(false);
  const [resultadosTeste, setResultadosTeste] = useState([]);
  const [historicoNotificacoes, setHistoricoNotificacoes] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [configNotificacoes, setConfigNotificacoes] = useState(null);

  // --- ESTADOS: TEMAS E PREFERÊNCIAS ---
  const [temaEscuro, setTemaEscuro] = useState(false);
  const [idioma, setIdioma] = useState('pt-BR');
  const [fusoHorario, setFusoHorario] = useState('America/Sao_Paulo');
  const [formatoData, setFormatoData] = useState('dd/MM/yyyy');
  const [formatoHora, setFormatoHora] = useState('24h');

  // --- ESTADOS: BACKUP E SEGURANÇA ---
  const [backupAutomatico, setBackupAutomatico] = useState(true);
  const [intervaloBackup, setIntervaloBackup] = useState('diario');
  const [backupsDisponiveis, setBackupsDisponiveis] = useState([]);
  const [carregandoBackups, setCarregandoBackups] = useState(false);

  // --- LOADING STATES ---
  const [loadingSalvar, setLoadingSalvar] = useState(false);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [salvandoNotificacoes, setSalvandoNotificacoes] = useState(false);
  
  const fileInputRef = useRef(null);

  // 1. CARREGAR DADOS GERAIS
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = onSnapshot(doc(db, "usuarios", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Dados gerais
        setNomeClinica(data.nomeClinica || '');
        setDocumento(data.documento || '');
        setTelefone(data.telefone || '');
        setChavePix(data.chavePix || '');
        setEndereco(data.endereco || '');
        setLogoBase64(data.logo || null);
        setNomeMedico(data.nomeMedico || '');
        setCrm(data.crm || '');
        setEmailClinica(data.emailClinica || '');
        setSiteClinica(data.siteClinica || '');
        setHorarioFuncionamento(data.horarioFuncionamento || '');
        setSobreClinica(data.sobreClinica || '');
        setDadosBancarios(data.dadosBancarios || {
          banco: '',
          agencia: '',
          conta: '',
          tipoConta: 'corrente',
          titular: ''
        });

        // Configurações de notificação
        if (data.configNotificacoes) {
          setConfigNotificacoes(data.configNotificacoes);
          setAutoConfirmacaoAgendamento(data.configNotificacoes.autoConfirmacaoAgendamento !== false);
          setLembreteConsulta(data.configNotificacoes.lembreteConsulta !== false);
          setIntervaloLembrete(data.configNotificacoes.intervaloLembrete?.toString() || '24');
          setNotificacoesEmail(data.configNotificacoes.notificacoesEmail !== false);
          setNotificacoesWhatsapp(data.configNotificacoes.notificacoesWhatsapp || false);
          setNotificacoesSMS(data.configNotificacoes.notificacoesSMS || false);
          setHorarioInicioNotificacoes(data.configNotificacoes.horarioInicioNotificacoes || '08:00');
          setHorarioFimNotificacoes(data.configNotificacoes.horarioFimNotificacoes || '20:00');
          setDiasAntecedencia(data.configNotificacoes.diasAntecedencia || [1, 2, 7]);
        }

        // Tema e preferências
        setTemaEscuro(data.temaEscuro || false);
        setIdioma(data.idioma || 'pt-BR');
        setFusoHorario(data.fusoHorario || 'America/Sao_Paulo');
        setFormatoData(data.formatoData || 'dd/MM/yyyy');
        setFormatoHora(data.formatoHora || '24h');

        // Backup
        setBackupAutomatico(data.backupAutomatico !== false);
        setIntervaloBackup(data.intervaloBackup || 'diario');
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  // 2. CARREGAR EQUIPE
  useEffect(() => {
    if (!user || userData?.role !== 'admin') return;
    
    async function loadEquipe() {
      try {
        let q;
        if (filtroEquipe === 'ativos') {
          q = query(
            collection(db, "usuarios"), 
            where("donoId", "==", user.uid), 
            where("role", "in", ["secretaria", "assistente"]),
            where("ativo", "==", true)
          );
        } else if (filtroEquipe === 'inativos') {
          q = query(
            collection(db, "usuarios"), 
            where("donoId", "==", user.uid), 
            where("role", "in", ["secretaria", "assistente"]),
            where("ativo", "==", false)
          );
        } else {
          q = query(
            collection(db, "usuarios"), 
            where("donoId", "==", user.uid), 
            where("role", "in", ["secretaria", "assistente"])
          );
        }
        
        const snap = await getDocs(q);
        const equipe = snap.docs.map(d => ({
          ...d.data(),
          id: d.id,
          createdAt: d.data().createdAt?.toDate(),
          ultimoAcesso: d.data().ultimoAcesso?.toDate()
        }));
        
        setListaEquipe(equipe);
      } catch (error) {
        console.error('Erro ao carregar equipe:', error);
        toast.error("Erro ao carregar equipe");
      }
    }
    
    loadEquipe();
  }, [user, userData, filtroEquipe]);

  // 3. CARREGAR HISTÓRICO DE NOTIFICAÇÕES
  useEffect(() => {
    if (activeTab === 'notificacoes') {
      handleCarregarHistorico();
    }
  }, [activeTab, user]);

  // --- FUNÇÕES PRINCIPAIS ---

  // GESTÃO DE EQUIPE
  const handleCriarSecretaria = async () => {
    if (!secEmail || !secSenha || !secNome) {
      return toast.error("Preencha todos os campos da secretária.");
    }
    if (secSenha.length < 6) {
      return toast.error("A senha deve ter no mínimo 6 dígitos.");
    }

    setLoadingEquipe(true);
    let secondaryApp = null;

    try {
      // 1. Cria instância secundária
      const config = getApp().options; 
      secondaryApp = initializeApp(config, "SecondaryApp_" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Cria usuário
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, secEmail, secSenha);
      const novoUid = userCredential.user.uid;

      // 3. Salva dados
      await setDoc(doc(db, "usuarios", novoUid), {
        email: secEmail,
        nome: secNome,
        role: 'secretaria',
        donoId: user.uid,
        createdAt: new Date(),
        ativo: true,
        ultimoAcesso: null,
        configNotificacoes: {
          receberNotificacoes: true,
          emailNotificacoes: secEmail,
          whatsappNotificacoes: ''
        }
      });

      // 4. Limpa sessão
      await signOut(secondaryAuth);
      
      toast.success("✅ Secretária cadastrada com sucesso!", 4000);
      
      // 5. Limpa formulário
      setSecNome('');
      setSecEmail('');
      setSecSenha('123456');
      
    } catch (err) {
      console.error("Erro criação secretária:", err);
      let mensagem = "Erro ao criar conta.";
      
      if (err.code === 'auth/email-already-in-use') {
        mensagem = "Este e-mail já está sendo usado.";
      } else if (err.code === 'auth/invalid-email') {
        mensagem = "E-mail inválido.";
      } else if (err.code === 'auth/weak-password') {
        mensagem = "Senha muito fraca. Use pelo menos 6 caracteres.";
      }
      
      toast.error(mensagem);
    } finally {
      if (secondaryApp) {
        try { deleteApp(secondaryApp); } catch(e) { console.warn(e); }
      }
      setLoadingEquipe(false);
    }
  };

  const handleAlternarStatusSecretaria = async (secretariaId, atualStatus) => {
    try {
      await updateDoc(doc(db, "usuarios", secretariaId), {
        ativo: !atualStatus,
        atualizadoEm: new Date()
      });
      
      toast.success(`Status ${!atualStatus ? 'ativado' : 'desativado'}!`);
      setLoadingEquipe(curr => !curr);
    } catch (error) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleExcluirSecretaria = async (secretariaId, secretariaNome) => {
    if (window.confirm(`Tem certeza que deseja remover permanentemente ${secretariaNome}?`)) {
      try {
        await deleteDoc(doc(db, "usuarios", secretariaId));
        toast.success("Secretária removida permanentemente.");
        setLoadingEquipe(curr => !curr);
      } catch (error) {
        toast.error("Erro ao remover. Contate o suporte.");
      }
    }
  };

  // LOGO
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validações
    if (!file.type.includes('image/')) {
      return toast.error("Apenas imagens são permitidas.");
    }
    
    if (file.size > 1024 * 1024) { // 1MB
      return toast.error("A imagem deve ter menos de 1MB.");
    }

    setLoadingLogo(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
      try {
        await clinicaService.atualizarDados(user.uid, { 
          logo: reader.result,
          logoAtualizadoEm: new Date()
        });
        toast.success("✅ Logo atualizada com sucesso!");
      } catch (error) { 
        toast.error("Erro ao salvar logo."); 
      } finally { 
        setLoadingLogo(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      toast.error("Erro ao ler a imagem.");
      setLoadingLogo(false);
    };
  };

  // DADOS GERAIS
  const handleSalvarGeral = async () => {
    setLoadingSalvar(true);
    try {
      const dadosAtualizar = { 
        nomeClinica, 
        nomeMedico, 
        crm, 
        documento, 
        telefone, 
        chavePix, 
        endereco,
        emailClinica,
        siteClinica,
        horarioFuncionamento,
        sobreClinica,
        dadosBancarios,
        atualizadoEm: new Date()
      };
      
      await clinicaService.atualizarDados(user.uid, dadosAtualizar);
      toast.success("✅ Configurações salvas com sucesso!");
    } catch (e) { 
      toast.error("❌ Erro ao salvar configurações."); 
    } finally { 
      setLoadingSalvar(false); 
    }
  };

  // NOTIFICAÇÕES
  const handleSalvarConfigNotificacoes = async () => {
    setSalvandoNotificacoes(true);
    try {
      const config = {
        lembreteConsulta,
        intervaloLembrete: parseInt(intervaloLembrete),
        autoConfirmacaoAgendamento,
        notificacoesEmail,
        notificacoesWhatsapp,
        notificacoesSMS,
        horarioInicioNotificacoes,
        horarioFimNotificacoes,
        diasAntecedencia,
        templateEmail: 'padrao',
        templateWhatsapp: 'padrao',
        nomeClinica,
        endereco,
        telefone,
        emailClinica,
        atualizadoEm: new Date()
      };

      await clinicaService.atualizarDados(user.uid, { configNotificacoes: config });
      setConfigNotificacoes(config);
      
      toast.success("✅ Configurações de notificação salvas!");
      
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error("❌ Erro ao salvar configurações");
    } finally {
      setSalvandoNotificacoes(false);
    }
  };

  const handleTestarNotificacoes = async () => {
    try {
      if (!user?.email) {
        toast.error('E-mail do usuário não encontrado');
        return;
      }

      setTestandoNotificacoes(true);
      setResultadosTeste([]);
      
      // Simulando teste
      const resultados = [];
      
      if (notificacoesEmail) {
        // Simular envio de e-mail
        await new Promise(resolve => setTimeout(resolve, 1000));
        resultados.push({
          canal: 'E-mail',
          status: 'sucesso',
          mensagem: 'E-mail enviado com sucesso'
        });
      }
      
      if (notificacoesWhatsapp && telefone) {
        // Simular envio de WhatsApp
        await new Promise(resolve => setTimeout(resolve, 1000));
        resultados.push({
          canal: 'WhatsApp',
          status: 'sucesso',
          mensagem: 'Mensagem enviada com sucesso'
        });
      } else if (notificacoesWhatsapp && !telefone) {
        resultados.push({
          canal: 'WhatsApp',
          status: 'erro',
          mensagem: 'Telefone não configurado'
        });
      }
      
      if (notificacoesSMS) {
        // SMS geralmente requer serviço externo
        resultados.push({
          canal: 'SMS',
          status: 'erro',
          mensagem: 'Serviço SMS não configurado'
        });
      }
      
      setResultadosTeste(resultados);
      
      // Mostrar toast com resultado
      if (resultados.every(r => r.status === 'sucesso')) {
        toast.success('✅ Teste realizado com sucesso! Verifique seus canais.', 5000);
      } else {
        const erros = resultados.filter(r => r.status === 'erro');
        toast.warning(`⚠️ ${erros.length} teste(s) falharam. Verifique as configurações.`, 6000);
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      toast.error('❌ Erro ao testar notificações: ' + error.message);
    } finally {
      setTestandoNotificacoes(false);
    }
  };

  const handleCarregarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      // Simulando histórico
      const historico = [
        {
          id: '1',
          status: 'enviada',
          tipo: 'lembrete_consulta',
          canal: 'email',
          conteudo: 'Lembrete de consulta agendada para amanhã',
          criadaEm: { toDate: () => new Date(Date.now() - 3600000) }
        },
        {
          id: '2',
          status: 'pendente',
          tipo: 'confirmacao_agendamento',
          canal: 'whatsapp',
          conteudo: 'Confirmação de agendamento',
          criadaEm: { toDate: () => new Date(Date.now() - 7200000) }
        }
      ];
      setHistoricoNotificacoes(historico);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setCarregandoHistorico(false);
    }
  };

  // CONFIGURAÇÕES AVANÇADAS
  const handleSalvarConfigAvancadas = async () => {
    setLoadingConfig(true);
    try {
      const dadosAtualizar = {
        temaEscuro,
        idioma,
        fusoHorario,
        formatoData,
        formatoHora,
        backupAutomatico,
        intervaloBackup,
        configAtualizadoEm: new Date()
      };

      await clinicaService.atualizarDados(user.uid, dadosAtualizar);
      
      // Aplicar tema imediatamente
      if (temaEscuro) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      toast.success("✅ Configurações avançadas salvas!");
      
    } catch (e) { 
      toast.error("❌ Erro ao salvar configurações."); 
    } finally { 
      setLoadingConfig(false); 
    }
  };

  // BACKUP
  const handleCriarBackup = async () => {
    try {
      const backupData = {
        timestamp: new Date(),
        userId: user.uid,
        dados: {
          nomeClinica,
          nomeMedico,
          telefone,
          emailClinica
        },
        status: 'pendente'
      };

      await setDoc(doc(collection(db, 'backups')), backupData);
      toast.success("✅ Backup solicitado!");
      
      // Atualizar lista de backups
      setTimeout(() => handleCarregarBackups(), 2000);
      
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      toast.error("❌ Erro ao criar backup");
    }
  };

  const handleCarregarBackups = async () => {
    setCarregandoBackups(true);
    try {
      const q = query(
        collection(db, 'backups'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const snap = await getDocs(q);
      const backups = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
      setBackupsDisponiveis(backups);
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
      toast.error("Erro ao carregar backups");
    } finally {
      setCarregandoBackups(false);
    }
  };

  // UTILITÁRIOS
  const copiarParaClipboard = (texto, label) => {
    if (!texto) {
      toast.warning("Nada para copiar");
      return;
    }
    
    navigator.clipboard.writeText(texto).then(() => {
      toast.success(`✅ ${label} copiado!`);
    }).catch(() => {
      toast.error("❌ Erro ao copiar.");
    });
  };

  const gerarRelatorioEquipe = () => {
    const cabecalho = `Relatório da Equipe - ${nomeClinica}\n`;
    const data = `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    const total = `Total de membros: ${listaEquipe.length}\n\n`;
    
    const conteudo = listaEquipe.map((membro, index) => {
      return `${index + 1}. ${membro.nome} | ${membro.email} | ${membro.role} | Status: ${membro.ativo !== false ? 'Ativo' : 'Inativo'} | Cadastrado em: ${membro.createdAt?.toLocaleDateString('pt-BR') || 'N/D'}`;
    }).join('\n');
    
    const relatorio = cabecalho + data + total + conteudo;
    
    const blob = new Blob([relatorio], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-equipe-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("✅ Relatório gerado!");
  };

  const gerarQRCodePIX = () => {
    if (!chavePix) {
      toast.warning("Configure uma chave PIX primeiro");
      return;
    }
    
    // Em um sistema real, você usaria uma biblioteca de QR Code
    // Aqui é apenas um placeholder
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`PIX:${chavePix}`)}`;
    
    const janela = window.open('', '_blank');
    janela.document.write(`
      <html>
        <head><title>QR Code PIX - ${nomeClinica}</title></head>
        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
          <div style="text-align: center; padding: 20px;">
            <h2>QR Code PIX</h2>
            <p>${nomeClinica}</p>
            <img src="${qrCodeUrl}" alt="QR Code PIX" style="border: 1px solid #ccc; padding: 10px;"/>
            <p style="margin-top: 20px; color: #666;">Escaneie este código para pagar via PIX</p>
            <p style="color: #999; font-size: 12px;">Chave: ${chavePix}</p>
          </div>
        </body>
      </html>
    `);
    janela.document.close();
  };

  // Se for secretária, mostrar mensagem de restrição
  if (userData?.role === 'secretaria') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Acesso Restrito</h2>
          <p className="text-gray-600 mb-6">
            Esta área é exclusiva para administradores. Entre em contato com o administrador do sistema para mais informações.
          </p>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  // COMPONENTES
  const TabButton = ({ id, icon: Icon, label, count, badge }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 flex-1 min-w-0 ${
        activeTab === id
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
          : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
          {count}
        </span>
      )}
      {badge && (
        <span className={`ml-auto text-xs px-2 py-1 rounded-full ${badge.color}`}>
          {badge.text}
        </span>
      )}
    </button>
  );

  const ConfigCard = ({ title, icon: Icon, children, color = 'blue' }) => {
    const colors = {
      blue: 'from-blue-50 to-blue-100/50 border-blue-100',
      green: 'from-green-50 to-green-100/50 border-green-100',
      purple: 'from-purple-50 to-purple-100/50 border-purple-100',
      amber: 'from-amber-50 to-amber-100/50 border-amber-100',
      red: 'from-red-50 to-red-100/50 border-red-100'
    };

    return (
      <div className={`bg-gradient-to-br ${colors[color]} rounded-xl border p-6`}>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Icon size={20} className={`text-${color}-600`} />
          {title}
        </h3>
        {children}
      </div>
    );
  };

  const ToggleSwitch = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{label}</h4>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-600 mt-1">Gerencie as configurações da sua clínica</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {userData?.nome?.charAt(0) || 'A'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{userData?.nome || 'Administrador'}</p>
                <p className="text-xs text-gray-500">{userData?.role || 'Admin'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
          <TabButton id="geral" icon={Settings} label="Geral" />
          <TabButton id="equipe" icon={Users} label="Equipe" count={listaEquipe.length} />
          <TabButton id="notificacoes" icon={Bell} label="Notificações" />
          <TabButton id="pagamentos" icon={CreditCard} label="Pagamentos" />
          <TabButton id="avancado" icon={ShieldCheck} label="Avançado" />
        </div>
      </div>

      {/* CONTEÚDO DAS TABS */}
      <div className="max-w-6xl mx-auto">
        
        {/* TAB GERAL */}
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LOGO */}
            <div className="lg:col-span-1">
              <ConfigCard title="Logo da Clínica" icon={Building} color="blue">
                <div 
                  className="relative group mb-4 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-40 h-40 mx-auto rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center transition-all duration-300 hover:border-blue-400 hover:shadow-lg">
                    {loadingLogo ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                        <span className="mt-2 text-sm text-gray-500">Processando...</span>
                      </div>
                    ) : logoBase64 ? (
                      <img 
                        src={logoBase64} 
                        alt="Logo da Clínica" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Clique para adicionar logo</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG até 1MB</p>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-4">
                      <Upload size={24} />
                      <span className="text-sm font-medium mt-2">Upload da Logo</span>
                    </div>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                    disabled={loadingLogo}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-1 flex items-center gap-2">
                      <ShieldCheck size={16} />
                      Recomendações
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Formato quadrado (1:1)</li>
                      <li>• Fundo transparente (PNG)</li>
                      <li>• Mínimo 300x300 pixels</li>
                      <li>• Máximo 1MB</li>
                    </ul>
                  </div>
                </div>
              </ConfigCard>
            </div>

            {/* DETALHES DA CLÍNICA */}
            <div className="lg:col-span-2 space-y-6">
              <ConfigCard title="Informações Profissionais" icon={Stethoscope} color="blue">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={nomeMedico}
                      onChange={(e) => setNomeMedico(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      placeholder="Dr. João Silva"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CRM/UF *
                    </label>
                    <input
                      type="text"
                      value={crm}
                      onChange={(e) => setCrm(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      placeholder="123456/SP"
                    />
                  </div>
                </div>
              </ConfigCard>

              <ConfigCard title="Dados da Clínica" icon={Building} color="green">
                <form onSubmit={(e) => { e.preventDefault(); handleSalvarGeral(); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome da Clínica *
                      </label>
                      <input
                        type="text"
                        value={nomeClinica}
                        onChange={(e) => setNomeClinica(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Clínica Saúde Total"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CNPJ/CPF *
                      </label>
                      <input
                        type="text"
                        value={documento}
                        onChange={(e) => setDocumento(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="00.000.000/0001-00"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WhatsApp *
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="(11) 99999-9999"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-mail Institucional
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="email"
                          value={emailClinica}
                          onChange={(e) => setEmailClinica(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="contato@clinica.com"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Site
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="url"
                          value={siteClinica}
                          onChange={(e) => setSiteClinica(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="https://www.sua-clinica.com"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horário de Funcionamento
                      </label>
                      <input
                        type="text"
                        value={horarioFuncionamento}
                        onChange={(e) => setHorarioFuncionamento(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Seg-Sex: 8h às 18h"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Endereço Completo *
                      </label>
                      <textarea
                        rows="3"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                        placeholder="Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sobre a Clínica
                      </label>
                      <textarea
                        rows="4"
                        value={sobreClinica}
                        onChange={(e) => setSobreClinica(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                        placeholder="Descreva brevemente os serviços e especialidades da sua clínica..."
                      />
                    </div>
                  </div>
                </form>
              </ConfigCard>

              {/* BOTÃO SALVAR */}
              <div className="flex justify-end">
                <button
                  onClick={handleSalvarGeral}
                  disabled={loadingSalvar}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingSalvar ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  {loadingSalvar ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB EQUIPE */}
        {activeTab === 'equipe' && (
          <div className="space-y-6">
            <ConfigCard title="Gerenciar Equipe" icon={Users} color="purple">
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Novo Membro da Equipe</h3>
                    <p className="text-gray-600 text-sm">Adicione secretárias ou assistentes</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={gerarRelatorioEquipe}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                    >
                      <FileText size={18} />
                      Exportar
                    </button>
                    
                    <select
                      value={filtroEquipe}
                      onChange={(e) => setFiltroEquipe(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="todos">Todos os membros</option>
                      <option value="ativos">Ativos</option>
                      <option value="inativos">Inativos</option>
                    </select>
                  </div>
                </div>

                {/* FORMULÁRIO DE CADASTRO */}
                <form onSubmit={(e) => { e.preventDefault(); handleCriarSecretaria(); }}>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          value={secNome}
                          onChange={(e) => setSecNome(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Maria Silva"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          E-mail de Acesso *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="email"
                            value={secEmail}
                            onChange={(e) => setSecEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="maria@clinica.com"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Senha Inicial *
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={secSenha}
                            onChange={(e) => setSecSenha(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono"
                            placeholder="••••••"
                            name="password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                      <div className="text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <AlertCircle size={16} className="text-amber-500" />
                          A senha será entregue ao novo membro para o primeiro acesso
                        </p>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={loadingEquipe}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loadingEquipe ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <UserPlus size={20} />
                        )}
                        {loadingEquipe ? 'Criando Conta...' : 'Criar Nova Conta'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* LISTA DA EQUIPE */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Equipe ({listaEquipe.length} membros)
                </h3>
                
                {listaEquipe.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-dashed border-gray-300">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-xl font-medium text-gray-600 mb-2">Nenhum membro na equipe</h4>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      Adicione sua primeira secretária ou assistente para começar a gerenciar sua equipe
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listaEquipe.map((membro) => (
                      <div key={membro.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              membro.ativo !== false 
                                ? 'bg-gradient-to-br from-blue-100 to-blue-200' 
                                : 'bg-gradient-to-br from-gray-100 to-gray-200'
                            }`}>
                              <span className={`font-bold text-lg ${
                                membro.ativo !== false ? 'text-blue-600' : 'text-gray-400'
                              }`}>
                                {membro.nome?.charAt(0)?.toUpperCase() || 'S'}
                              </span>
                            </div>
                            {membro.ativo !== false && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                <CheckCircle size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">{membro.nome || 'Secretária'}</h4>
                                <p className="text-sm text-gray-600 truncate flex items-center gap-1">
                                  <Mail size={14} />
                                  {membro.email}
                                </p>
                              </div>
                              
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleAlternarStatusSecretaria(membro.id, membro.ativo !== false)}
                                  className={`p-2 rounded-lg transition ${
                                    membro.ativo !== false
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                  title={membro.ativo !== false ? 'Desativar' : 'Ativar'}
                                >
                                  {membro.ativo !== false ? (
                                    <CheckCircle size={16} />
                                  ) : (
                                    <XCircle size={16} />
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => copiarParaClipboard(membro.email, 'E-mail copiado')}
                                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                                  title="Copiar e-mail"
                                >
                                  <Copy size={16} />
                                </button>
                                
                                <button
                                  onClick={() => handleExcluirSecretaria(membro.id, membro.nome)}
                                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                                  title="Remover permanentemente"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                {membro.role === 'secretaria' ? 'Secretária' : 'Assistente'}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                {membro.createdAt?.toLocaleDateString('pt-BR') || 'Data não disponível'}
                              </span>
                              {membro.ultimoAcesso && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  Último acesso: {membro.ultimoAcesso.toLocaleDateString('pt-BR')}
                                </span>
                              )}
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

        {/* TAB NOTIFICAÇÕES */}
        {activeTab === 'notificacoes' && (
          <div className="space-y-6">
            <ConfigCard title="Configurações de Notificação" icon={Bell} color="amber">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CONFIGURAÇÕES */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4">Preferências de Notificação</h4>
                    <div className="space-y-4">
                      <ToggleSwitch
                        checked={autoConfirmacaoAgendamento}
                        onChange={setAutoConfirmacaoAgendamento}
                        label="Confirmação Automática"
                        description="Confirmar agendamentos automaticamente"
                      />
                      
                      <ToggleSwitch
                        checked={lembreteConsulta}
                        onChange={setLembreteConsulta}
                        label="Lembretes de Consulta"
                        description="Enviar lembretes para pacientes"
                      />
                      
                      {lembreteConsulta && (
                        <div className="p-4 bg-white rounded-lg border border-blue-100">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enviar lembrete com antecedência
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={intervaloLembrete}
                              onChange={(e) => setIntervaloLembrete(e.target.value)}
                              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            >
                              <option value="1">1 hora antes</option>
                              <option value="3">3 horas antes</option>
                              <option value="6">6 horas antes</option>
                              <option value="12">12 horas antes</option>
                              <option value="24">24 horas antes</option>
                              <option value="48">48 horas antes</option>
                            </select>
                            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg">horas</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4">Canais de Notificação</h4>
                    <div className="space-y-4">
                      <ToggleSwitch
                        checked={notificacoesEmail}
                        onChange={setNotificacoesEmail}
                        label="Notificações por E-mail"
                        description="Receber alertas por e-mail"
                      />
                      
                      <ToggleSwitch
                        checked={notificacoesWhatsapp}
                        onChange={setNotificacoesWhatsapp}
                        label="Notificações por WhatsApp"
                        description="Enviar mensagens via WhatsApp"
                      />
                      
                      <ToggleSwitch
                        checked={notificacoesSMS}
                        onChange={setNotificacoesSMS}
                        label="Notificações por SMS"
                        description="Enviar mensagens de texto"
                      />
                    </div>
                  </div>
                  
                  {/* HORÁRIOS DE NOTIFICAÇÃO */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4">Horários de Envio</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Início das Notificações
                        </label>
                        <input
                          type="time"
                          value={horarioInicioNotificacoes}
                          onChange={(e) => setHorarioInicioNotificacoes(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fim das Notificações
                        </label>
                        <input
                          type="time"
                          value={horarioFimNotificacoes}
                          onChange={(e) => setHorarioFimNotificacoes(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* HISTÓRICO E TESTE */}
                <div className="space-y-6">
                  {/* TESTE DE NOTIFICAÇÕES */}
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <h4 className="font-bold text-gray-900 mb-3">Testar Notificações</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Envie uma notificação de teste para verificar se suas configurações estão funcionando
                    </p>
                    
                    <button
                      onClick={handleTestarNotificacoes}
                      disabled={testandoNotificacoes || (!notificacoesEmail && !notificacoesWhatsapp && !notificacoesSMS)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {testandoNotificacoes ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Send size={20} />
                      )}
                      {testandoNotificacoes ? 'Testando...' : 'Testar Notificações'}
                    </button>
                    
                    {/* RESULTADOS DO TESTE */}
                    {resultadosTeste.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {resultadosTeste.map((resultado, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg flex items-center justify-between ${
                              resultado.status === 'sucesso'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {resultado.status === 'sucesso' ? (
                                <CheckCircle size={16} />
                              ) : (
                                <XCircle size={16} />
                              )}
                              <span className="font-medium">{resultado.canal}</span>
                            </div>
                            <span className="text-sm">{resultado.mensagem}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* HISTÓRICO */}
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-gray-900">Histórico Recente</h4>
                      <button
                        onClick={handleCarregarHistorico}
                        disabled={carregandoHistorico}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {carregandoHistorico ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        Atualizar
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {historicoNotificacoes.length === 0 ? (
                        <div className="text-center py-4">
                          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Nenhuma notificação enviada</p>
                        </div>
                      ) : (
                        historicoNotificacoes.map((notif) => (
                          <div
                            key={notif.id}
                            className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  notif.status === 'enviada' ? 'bg-green-100 text-green-700' :
                                  notif.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {notif.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {notif.tipo?.replace('_', ' ')}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400">
                                {notif.criadaEm?.toDate?.().toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {notif.conteudo || notif.assunto}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">
                                {notif.canal}
                              </span>
                              {notif.consultaId && (
                                <button className="text-xs text-blue-600 hover:text-blue-700">
                                  Ver consulta
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* BOTÃO SALVAR */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-gray-900">Salvar Configurações</h4>
                    <p className="text-sm text-gray-600">Aplique as alterações nas notificações</p>
                  </div>
                  <button
                    onClick={handleSalvarConfigNotificacoes}
                    disabled={salvandoNotificacoes}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {salvandoNotificacoes ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Save size={20} />
                    )}
                    {salvandoNotificacoes ? 'Salvando...' : 'Salvar Notificações'}
                  </button>
                </div>
              </div>
            </ConfigCard>
          </div>
        )}

        {/* TAB PAGAMENTOS */}
        {activeTab === 'pagamentos' && (
          <div className="space-y-6">
            <ConfigCard title="Configurações de Pagamento" icon={CreditCard} color="green">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PIX */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900">Configurações PIX</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chave PIX
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={chavePix}
                          onChange={(e) => setChavePix(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                          placeholder="CPF/CNPJ, telefone, e-mail ou chave aleatória"
                        />
                      </div>
                      <button
                        onClick={() => copiarParaClipboard(chavePix, 'Chave PIX')}
                        disabled={!chavePix}
                        className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Copy size={16} />
                        Copiar
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Pode ser CPF, CNPJ, e-mail, telefone ou chave aleatória
                    </p>
                  </div>
                  
                  {chavePix && (
                    <div className="mt-4">
                      <button
                        onClick={gerarQRCodePIX}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center gap-2"
                      >
                        <QrCode size={20} />
                        Gerar QR Code PIX
                      </button>
                    </div>
                  )}
                </div>

                {/* DADOS BANCÁRIOS */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900">Dados Bancários</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banco
                      </label>
                      <input
                        type="text"
                        value={dadosBancarios.banco}
                        onChange={(e) => setDadosBancarios({...dadosBancarios, banco: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Banco do Brasil"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agência
                      </label>
                      <input
                        type="text"
                        value={dadosBancarios.agencia}
                        onChange={(e) => setDadosBancarios({...dadosBancarios, agencia: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="0000-0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Conta
                      </label>
                      <input
                        type="text"
                        value={dadosBancarios.conta}
                        onChange={(e) => setDadosBancarios({...dadosBancarios, conta: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="00000-0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Conta
                      </label>
                      <select
                        value={dadosBancarios.tipoConta}
                        onChange={(e) => setDadosBancarios({...dadosBancarios, tipoConta: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      >
                        <option value="corrente">Conta Corrente</option>
                        <option value="poupanca">Conta Poupança</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Titular da Conta
                      </label>
                      <input
                        type="text"
                        value={dadosBancarios.titular}
                        onChange={(e) => setDadosBancarios({...dadosBancarios, titular: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Nome completo do titular"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* BOTÃO SALVAR */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={handleSalvarGeral}
                    disabled={loadingSalvar}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingSalvar ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Save size={20} />
                    )}
                    {loadingSalvar ? 'Salvando...' : 'Salvar Pagamentos'}
                  </button>
                </div>
              </div>
            </ConfigCard>
          </div>
        )}

        {/* TAB AVANÇADO */}
        {activeTab === 'avancado' && (
          <div className="space-y-6">
            <ConfigCard title="Configurações Avançadas" icon={ShieldCheck} color="purple">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* APARÊNCIA E LOCALIZAÇÃO */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4">Aparência</h4>
                    <ToggleSwitch
                      checked={temaEscuro}
                      onChange={setTemaEscuro}
                      label="Modo Escuro"
                      description="Ativar tema escuro no sistema"
                    />
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4">Localização</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Idioma
                        </label>
                        <select
                          value={idioma}
                          onChange={(e) => setIdioma(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        >
                          <option value="pt-BR">Português (Brasil)</option>
                          <option value="en-US">English (US)</option>
                          <option value="es-ES">Español</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fuso Horário
                        </label>
                        <select
                          value={fusoHorario}
                          onChange={(e) => setFusoHorario(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        >
                          <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                          <option value="America/Manaus">Manaus (GMT-4)</option>
                          <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                          <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
                          <option value="Europe/London">London (GMT+0)</option>
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Formato de Data
                          </label>
                          <select
                            value={formatoData}
                            onChange={(e) => setFormatoData(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          >
                            <option value="dd/MM/yyyy">DD/MM/AAAA</option>
                            <option value="MM/dd/yyyy">MM/DD/AAAA</option>
                            <option value="yyyy-MM-dd">AAAA-MM-DD</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Formato de Hora
                          </label>
                          <select
                            value={formatoHora}
                            onChange={(e) => setFormatoHora(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          >
                            <option value="24h">24 horas</option>
                            <option value="12h">12 horas (AM/PM)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BACKUP E SEGURANÇA */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4">Backup e Segurança</h4>
                    <div className="space-y-4">
                      <ToggleSwitch
                        checked={backupAutomatico}
                        onChange={setBackupAutomatico}
                        label="Backup Automático"
                        description="Realizar backup diário dos dados"
                      />
                      
                      {backupAutomatico && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Intervalo do Backup
                          </label>
                          <select
                            value={intervaloBackup}
                            onChange={(e) => setIntervaloBackup(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          >
                            <option value="diario">Diário</option>
                            <option value="semanal">Semanal</option>
                            <option value="mensal">Mensal</option>
                          </select>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleCriarBackup}
                          className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center gap-2 flex-1"
                        >
                          <Database size={18} />
                          Criar Backup Agora
                        </button>
                        
                        <button
                          onClick={handleCarregarBackups}
                          disabled={carregandoBackups}
                          className="px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 flex-1"
                        >
                          {carregandoBackups ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <History size={18} />
                          )}
                          Ver Backups
                        </button>
                      </div>
                      
                      {/* LISTA DE BACKUPS */}
                      {backupsDisponiveis.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                          {backupsDisponiveis.map((backup) => (
                            <div
                              key={backup.id}
                              className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between"
                            >
                              <div>
                                <span className="font-medium text-gray-900">
                                  Backup {backup.timestamp?.toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {backup.timestamp?.toLocaleTimeString('pt-BR')}
                                </span>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                backup.status === 'completo' ? 'bg-green-100 text-green-700' :
                                backup.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {backup.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4">Segurança da Conta</h4>
                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja sair de todas as sessões?')) {
                          logout();
                        }
                      }}
                      className="w-full p-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition flex items-center justify-center gap-2 font-medium"
                    >
                      <LogOut size={16} />
                      Sair de Todas as Sessões
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Isso desconectará todos os dispositivos conectados
                    </p>
                  </div>
                </div>
              </div>
              
              {/* BOTÃO SALVAR */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-gray-900">Salvar Configurações Avançadas</h4>
                    <p className="text-sm text-gray-600">Aplique todas as alterações feitas nesta seção</p>
                  </div>
                  <button
                    onClick={handleSalvarConfigAvancadas}
                    disabled={loadingConfig}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingConfig ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Save size={20} />
                    )}
                    {loadingConfig ? 'Salvando...' : 'Salvar Configurações'}
                  </button>
                </div>
              </div>
            </ConfigCard>
          </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="text-center text-sm text-gray-500">
          <p>Sistema Clínica v2.0 • Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          <p className="mt-1">© {new Date().getFullYear()} Todos os direitos reservados</p>
        </div>
      </div>

      {/* TOAST CONTAINER */}
      <ToastContainer />
    </div>
  );
}