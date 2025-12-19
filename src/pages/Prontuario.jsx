import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../services/firebaseConfig'; 
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { prontuarioService } from '../services/prontuarioService';
import { pacienteService } from '../services/pacienteService';

import TemplateManager from '../components/TemplateManager';
import ChecklistPanel from '../components/ChecklistPanel';
import { templates as listaTemplates, defaultTemplates } from '../utils/templates';
import { checklists } from '../utils/checklists';

import { 
  Clock, Pill, FileBadge, FileCheck, Save, X,
  Stethoscope, ChevronRight, Download, ClipboardList, Search,
  Menu, X as XIcon
} from 'lucide-react';

export default function ProntuarioAvancado() {
  const { userData } = useAuth();
  const { showToast } = useToast();

  const abas = [
    { id: 'evolucao', label: 'Evolução', icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'receita', label: 'Receita', icon: Pill, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'atestado', label: 'Atestado', icon: FileBadge, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'declaracao', label: 'Declaração', icon: FileCheck, color: 'text-purple-600', bg: 'bg-purple-50' }
  ];

  const [pacientes, setPacientes] = useState([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [busca, setBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('evolucao');
  const [historico, setHistorico] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registroVisualizar, setRegistroVisualizar] = useState(null); 
  
  const [formEvolucao, setFormEvolucao] = useState({ titulo: '', conteudo: '', tags: [] });
  const [documentos, setDocumentos] = useState({ receita: '', atestado: '', declaracao: '' });

  const clinicaId = userData?.clinicaId || userData?.donoId || "";
  const meuUsuarioId = userData?.uid || userData?.id || "";
  const abaAtual = abas.find(a => a.id === abaAtiva) || abas[0];

  const formatarCPF = (cpf) => {
    if (!cpf) return '---';
    const limpo = cpf.replace(/\D/g, "");
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const handleSelectPaciente = (paciente) => {
    setPacienteSelecionado(paciente);
    if (window.innerWidth < 1024) {
      setMobileMenuOpen(false);
      setSidebarOpen(false);
    }
  };

  useEffect(() => { 
    if (clinicaId) pacienteService.listar(clinicaId).then(setPacientes); 
  }, [clinicaId]);

  useEffect(() => {
    if (!pacienteSelecionado?.id || !meuUsuarioId) return;
    const q = query(
      collection(db, "prontuarios"),
      where("pacienteId", "==", pacienteSelecionado.id),
      where("userId", "==", meuUsuarioId),
      orderBy("data", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistorico(docs);
    });
    return () => unsubscribe();
  }, [pacienteSelecionado, meuUsuarioId, clinicaId]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSalvarRegistro = async () => {
    if (!pacienteSelecionado) return showToast({ message: "Selecione um paciente", type: "warning" });
    const conteudo = abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva];
    
    try {
      const payload = {
        pacienteId: pacienteSelecionado.id,
        userId: meuUsuarioId, 
        clinicaId: clinicaId,
        tipo: abaAtiva,
        titulo: abaAtiva === 'evolucao' ? (formEvolucao.titulo || 'Evolução Clínica') : abaAtiva.toUpperCase(),
        conteudo: conteudo,
        medico: userData?.nome || 'Médico Responsável', 
        data: new Date(),
        tags: abaAtiva === 'evolucao' ? formEvolucao.tags : []
      };
      await prontuarioService.salvarEvolucao(payload);
      showToast({ message: `Documento salvo com sucesso!`, type: "success" });
      if (abaAtiva === 'evolucao') setFormEvolucao({ titulo: '', conteudo: '', tags: [] });
      else setDocumentos(prev => ({ ...prev, [abaAtiva]: '' }));
    } catch (error) {
      showToast({ message: "Erro ao salvar", type: "error" });
    }
  };

  const handleImprimir = () => {
    if (!pacienteSelecionado) return;
    const conteudo = abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva];
    const janela = window.open('', '_blank');
    janela.document.write(`
      <html>
        <head><style>body { font-family: sans-serif; padding: 20px; font-size: 16px; line-height: 1.6; } .header { text-align: center; border-bottom: 2px solid #3182ce; margin-bottom: 20px; } @media print { body { padding: 10px; font-size: 14px; } }</style></head>
        <body>
          <div class="header"><h1>${userData?.nomeClinica || 'CLÍNICA'}</h1><h3>${abaAtual.label}</h3></div>
          <p><strong>Paciente:</strong> ${pacienteSelecionado.nome}</p>
          <div>${conteudo}</div>
        </body>
      </html>
    `);
    janela.document.close();
    janela.print();
  };

  return (
    <div className="h-[calc(100vh-80px)] bg-slate-50 flex flex-col overflow-hidden">
      <style>{`
        .ql-editor { 
          font-size: 1rem !important; 
          line-height: 1.6 !important; 
          color: #1e293b !important; 
          min-height: 300px; 
        }
        @media (min-width: 768px) {
          .ql-editor { 
            font-size: 1.125rem !important; 
            min-height: 400px; 
          }
        }
        @media (min-width: 1280px) {
          .ql-editor { 
            font-size: 1.25rem !important; 
            min-height: 450px; 
          }
        }
        .ql-editor p { margin-bottom: 12px !important; }
        .max-content-width { max-width: 1800px; margin: 0 auto; width: 100%; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        /* Estilos para mobile */
        @media (max-width: 768px) {
          .ql-toolbar { padding: 8px !important; }
          .ql-toolbar .ql-formats { margin-right: 4px !important; }
          .ql-toolbar .ql-formats button { padding: 4px !important; }
        }
      `}</style>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-3 bg-white rounded-full shadow-lg border border-slate-200"
      >
        {mobileMenuOpen ? <XIcon size={20} /> : <Menu size={20} />}
      </button>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar para pacientes */}
        <AnimatePresence>
          {(sidebarOpen || mobileMenuOpen) && (
            <motion.div 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className={`
                fixed lg:relative inset-y-0 left-0 z-40 w-80 2xl:w-96 bg-white border-r 
                flex flex-col shadow-lg lg:shadow-sm
                ${mobileMenuOpen ? 'lg:hidden' : ''}
              `}
            >
              <div className="p-4 lg:p-6 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar paciente..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
                    value={busca} 
                    onChange={e => setBusca(e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => handleSelectPaciente(p)}
                    className={`
                      w-full p-4 mb-3 rounded-2xl text-left transition-all 
                      ${pacienteSelecionado?.id === p.id 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'hover:bg-slate-50'
                      }
                    `}
                  >
                    <p className="font-bold text-sm 2xl:text-base truncate">{p.nome}</p>
                    <p className="text-[10px] 2xl:text-xs opacity-60">CPF: {formatarCPF(p.cpf)}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay para mobile menu */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {pacienteSelecionado ? (
            <>
              {/* Header */}
              <div className="h-16 lg:h-20 bg-white border-b px-4 lg:px-8 2xl:px-12 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-3 lg:gap-6">
                  <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="hidden lg:block p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
                  >
                    <ChevronRight className={sidebarOpen ? 'rotate-180' : ''} size={24}/>
                  </button>
                  <div className="flex flex-col max-w-[60%] lg:max-w-none">
                    <h2 className="font-bold text-slate-800 text-lg lg:text-xl 2xl:text-2xl truncate">
                      {pacienteSelecionado.nome}
                    </h2>
                    <span className="text-[10px] lg:text-xs text-slate-400 font-medium tracking-wide">
                      PACIENTE SELECIONADO
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 lg:gap-4">
                  <button 
                    onClick={handleImprimir}
                    className="hidden sm:flex px-4 lg:px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold items-center gap-2 hover:bg-slate-50 transition-all"
                  >
                    <Download size={18} /> 
                    <span className="hidden lg:inline">EXPORTAR PDF</span>
                  </button>
                  <button 
                    onClick={handleSalvarRegistro}
                    className="px-4 lg:px-6 py-2 lg:py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all uppercase tracking-wider"
                  >
                    <Save size={18} /> 
                    <span className="hidden sm:inline">Salvar {abaAtiva}</span>
                    <span className="sm:hidden">Salvar</span>
                  </button>
                </div>
              </div>

              {/* Conteúdo Principal */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-8 2xl:p-12 custom-scrollbar">
                <div className="max-content-width space-y-6 lg:space-y-8">
                  
                  {/* Abas - SEMPRE VISÍVEL NO TOPO */}
                  <div className="flex overflow-x-auto pb-2 lg:pb-0 lg:flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-100 w-full shadow-sm">
                    {abas.map(a => (
                      <button 
                        key={a.id} 
                        onClick={() => setAbaAtiva(a.id)}
                        className={`
                          flex-shrink-0 px-4 lg:px-6 py-3 rounded-xl text-sm font-bold 
                          flex items-center gap-2 transition-all
                          ${abaAtiva === a.id 
                            ? `${a.bg} ${a.color} shadow-sm ring-1 ring-inset ring-current/10` 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                          }
                        `}
                      >
                        <a.icon size={18} /> 
                        <span className="hidden sm:inline">{a.label}</span>
                        <span className="sm:hidden">{a.label.charAt(0)}</span>
                      </button>
                    ))}
                  </div>

                  {/* Layout Responsivo - Mobile: uma coluna, Desktop: duas colunas */}
                  <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-10">
                    
                    {/* ÁREA PRINCIPAL DO EDITOR (Mobile: em cima, Desktop: esquerda) */}
                    <div className="lg:col-span-8 2xl:col-span-9 space-y-6 lg:space-y-8">
                      {/* Editor Principal */}
                      <div className="bg-white p-4 sm:p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[500px]">
                        {abaAtiva === 'evolucao' && (
                          <input 
                            className="w-full text-2xl lg:text-4xl font-extrabold outline-none border-b border-slate-50 pb-4 mb-6 lg:mb-8 focus:border-blue-500 transition-all placeholder:text-slate-200" 
                            placeholder="Título da Evolução..." 
                            value={formEvolucao.titulo} 
                            onChange={e => setFormEvolucao({...formEvolucao, titulo: e.target.value})} 
                          />
                        )}
                        
                        <div className="min-h-[400px] lg:min-h-[500px]">
                          <ReactQuill 
                            theme="snow" 
                            value={abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva]} 
                            onChange={(val) => {
                              if (abaAtiva === 'evolucao') setFormEvolucao(prev => ({ ...prev, conteudo: val }));
                              else setDocumentos(prev => ({ ...prev, [abaAtiva]: val }));
                            }}
                            modules={{
                              toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                ['link'],
                                ['clean']
                              ]
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Templates e Checklists - Mobile: após o editor */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                        <TemplateManager 
                          templates={listaTemplates} 
                          onSelectTemplate={(t) => {
                            const html = defaultTemplates[t.tipo]?.(pacienteSelecionado, new Date().toLocaleDateString(), userData?.nomeClinica);
                            if (abaAtiva === 'evolucao') setFormEvolucao(p => ({ ...p, conteudo: html }));
                            else setDocumentos(p => ({ ...p, [abaAtiva]: html }));
                          }} 
                          currentType={abaAtiva} 
                        />
                        <ChecklistPanel 
                          checklists={checklists} 
                          onSelectChecklist={c => {
                            const base = abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva];
                            const novo = base + "<br>• " + c;
                            if (abaAtiva === 'evolucao') setFormEvolucao(p => ({ ...p, conteudo: novo }));
                            else setDocumentos(p => ({ ...p, [abaAtiva]: novo }));
                          }} 
                        />
                      </div>

                      {/* HISTÓRICO - VISÍVEL APENAS EM MOBILE (depois de tudo) */}
                      <div className="lg:hidden">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          <h3 className="font-bold text-xs text-slate-400 uppercase mb-6 flex items-center gap-3 tracking-[0.2em]">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                              <Clock size={16}/>
                            </div>
                            Histórico Recente
                          </h3>
                          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {historico.slice(0, 3).map(h => ( // Apenas 3 itens em mobile
                              <div key={h.id} className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-white transition-all shadow-sm">
                                <div className="flex justify-between text-[10px] font-bold text-blue-500 uppercase mb-2">
                                  <span className="px-2 py-0.5 bg-blue-50 rounded-md tracking-wider truncate max-w-[50%]">
                                    {h.tipo}
                                  </span>
                                  <span className="text-slate-400 font-medium text-[9px]">
                                    {h.data?.seconds ? new Date(h.data.seconds * 1000).toLocaleDateString() : 'Hoje'}
                                  </span>
                                </div>
                                <p className="font-bold text-base text-slate-800 mb-3 line-clamp-2 leading-snug">
                                  {h.titulo}
                                </p>
                                <button 
                                  onClick={() => setRegistroVisualizar(h)}
                                  className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm uppercase tracking-widest"
                                >
                                  Detalhes
                                </button>
                              </div>
                            ))}
                          </div>
                          {historico.length > 3 && (
                            <div className="mt-4 text-center">
                              <button 
                                onClick={() => setRegistroVisualizar(historico[0])} // Abre o modal com o primeiro item
                                className="text-sm text-blue-600 font-medium hover:text-blue-800"
                              >
                                Ver mais {historico.length - 3} registros...
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* HISTÓRICO - VISÍVEL APENAS EM DESKTOP (lado direito) */}
                    <div className="hidden lg:block lg:col-span-4 2xl:col-span-3">
                      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sticky top-0 h-[calc(100vh-280px)]">
                        <h3 className="font-bold text-xs text-slate-400 uppercase mb-8 flex items-center gap-3 tracking-[0.2em]">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Clock size={16}/>
                          </div>
                          Histórico Recente
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                          {historico.map(h => (
                            <div key={h.id} className="p-6 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-blue-100 hover:bg-white transition-all shadow-sm">
                              <div className="flex justify-between text-[10px] font-bold text-blue-500 uppercase mb-3">
                                <span className="px-2 py-0.5 bg-blue-50 rounded-md tracking-wider truncate max-w-[50%]">
                                  {h.tipo}
                                </span>
                                <span className="text-slate-400 font-medium text-[9px] lg:text-[10px]">
                                  {h.data?.seconds ? new Date(h.data.seconds * 1000).toLocaleDateString() : 'Hoje'}
                                </span>
                              </div>
                              <p className="font-bold text-lg text-slate-800 mb-4 line-clamp-2 leading-snug">
                                {h.titulo}
                              </p>
                              <button 
                                onClick={() => setRegistroVisualizar(h)}
                                className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm uppercase tracking-widest"
                              >
                                Detalhes
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-200 font-bold bg-white p-4">
              <div className="relative mb-6 lg:mb-8">
                <Stethoscope size={80} lg:size={120} className="opacity-[0.03]" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-16 h-16 lg:w-24 lg:h-24 bg-slate-50 rounded-full animate-pulse flex items-center justify-center">
                      <Search size={24} lg:size={32} className="text-slate-300" />
                   </div>
                </div>
              </div>
              <p className="text-lg lg:text-2xl tracking-tighter text-slate-400 uppercase text-center">
                Selecione um paciente para iniciar
              </p>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold lg:hidden"
              >
                Buscar Paciente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Visualização */}
      <AnimatePresence>
        {registroVisualizar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6 bg-slate-900/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white w-full max-w-full lg:max-w-5xl max-h-[90vh] rounded-3xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
            >
              <div className="p-6 lg:p-10 border-b flex justify-between items-center bg-slate-50/50">
                <div className="space-y-1 max-w-[80%]">
                  <h3 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight truncate">
                    {registroVisualizar.titulo}
                  </h3>
                  <p className="text-xs lg:text-sm text-slate-400 flex items-center gap-2 font-medium uppercase tracking-widest">
                    <Clock size={12} lg:size={14} /> 
                    Registrado em {new Date(registroVisualizar.data?.seconds * 1000).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => setRegistroVisualizar(null)}
                  className="p-2 lg:p-4 bg-white border border-slate-200 rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                >
                  <X size={20} lg:size={28} />
                </button>
              </div>
              <div className="p-6 lg:p-12 overflow-y-auto flex-1 text-slate-700 text-base lg:text-xl leading-relaxed custom-scrollbar">
                <div 
                  className="prose prose-slate prose-sm lg:prose-xl max-w-none" 
                  dangerouslySetInnerHTML={{ __html: registroVisualizar.conteudo }} 
                />
              </div>
              <div className="p-6 lg:p-8 bg-slate-50 border-t flex justify-end">
                <button 
                  onClick={() => setRegistroVisualizar(null)}
                  className="px-6 lg:px-10 py-3 lg:py-4 bg-slate-800 text-white rounded-xl lg:rounded-[1.25rem] font-bold uppercase tracking-widest hover:bg-slate-700 transition-all w-full lg:w-auto"
                >
                  Fechar Registro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}