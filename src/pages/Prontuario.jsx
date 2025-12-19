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

// IMPORTAÇÕES CORRIGIDAS AQUI (ClipboardList adicionado)
import { 
  Clock, Pill, FileBadge, FileCheck, Save, X,
  Stethoscope, Search, Menu, Download, ClipboardList, ChevronLeft 
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
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [registroVisualizar, setRegistroVisualizar] = useState(null); 
  
  const [formEvolucao, setFormEvolucao] = useState({ titulo: '', conteudo: '', tags: [] });
  const [documentos, setDocumentos] = useState({ receita: '', atestado: '', declaracao: '' });

  const clinicaId = userData?.clinicaId || userData?.donoId || "";
  const meuUsuarioId = userData?.uid || userData?.id || "";

  useEffect(() => { 
    if (clinicaId) {
        pacienteService.listar(clinicaId)
            .then(res => setPacientes(res || []))
            .catch(() => setPacientes([]));
    }
  }, [clinicaId]);

  useEffect(() => {
    if (!pacienteSelecionado?.id || !meuUsuarioId) return;
    
    const q = query(
      collection(db, "prontuarios"),
      where("pacienteId", "==", pacienteSelecionado.id),
      where("clinicaId", "==", clinicaId),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistorico(docs);
    }, (error) => console.error("Erro Firestore:", error));

    return () => unsubscribe();
  }, [pacienteSelecionado, meuUsuarioId, clinicaId]);

  const selecionarPaciente = (p) => {
    setPacienteSelecionado(p);
    setSidebarOpen(false);
  };

  const handleSalvarRegistro = async () => {
    if (!pacienteSelecionado) return showToast({ message: "Selecione um paciente", type: "warning" });
    const conteudo = abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva];
    
    if (!conteudo || conteudo === '<p><br></p>') {
        return showToast({ message: "O conteúdo está vazio", type: "warning" });
    }

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
      showToast({ message: `Documento salvo!`, type: "success" });
      
      if (abaAtiva === 'evolucao') setFormEvolucao({ titulo: '', conteudo: '', tags: [] });
      else setDocumentos(prev => ({ ...prev, [abaAtiva]: '' }));
    } catch (error) {
      showToast({ message: "Erro ao salvar", type: "error" });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden w-full max-w-[100vw]">
      <style>{`
        .ql-container.ql-snow { border: none !important; }
        .ql-editor { font-size: 16px !important; min-height: 250px !important; padding: 10px 0 !important; }
        .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f1f5f9 !important; padding: 8px 0 !important; }
        .quill { width: 100% !important; max-width: 100% !important; }
        .tabs-container::-webkit-scrollbar { display: none; }
      `}</style>

      {/* SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              className="fixed lg:relative inset-y-0 left-0 w-[85%] sm:w-80 bg-white z-[70] flex flex-col shadow-2xl lg:shadow-none border-r"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs tracking-widest uppercase opacity-50">Lista de Pacientes</h3>
                <button onClick={() => setSidebarOpen(false)} className="p-2 lg:hidden"><X size={20}/></button>
              </div>
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input type="text" placeholder="Nome do paciente..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm outline-none" 
                    value={busca} onChange={e => setBusca(e.target.value)} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {pacientes?.filter(p => p?.nome?.toLowerCase().includes(busca.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => selecionarPaciente(p)} 
                    className={`w-full p-4 mb-2 rounded-2xl text-left transition-all ${pacienteSelecionado?.id === p.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50'}`}>
                    <p className="font-bold text-sm truncate">{p.nome}</p>
                    <p className="text-[10px] opacity-70 uppercase font-mono">{p.cpf || 'SEM CPF'}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 bg-slate-50 rounded-lg">
              <Menu size={22} />
            </button>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base truncate uppercase tracking-tight">
              {pacienteSelecionado?.nome || "Prontuário Médico"}
            </h2>
          </div>
          {pacienteSelecionado && (
            <button onClick={handleSalvarRegistro} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
              <Save size={18} />
              <span className="hidden sm:inline font-bold text-xs">SALVAR</span>
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {pacienteSelecionado ? (
            <div className="p-4 lg:p-8 space-y-6 max-w-full overflow-x-hidden">
              <div className="flex gap-2 overflow-x-auto tabs-container touch-pan-x">
                {abas.map(tab => (
                  <button key={tab.id} onClick={() => setAbaAtiva(tab.id)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[11px] font-bold transition-all border flex items-center gap-2 ${
                      abaAtiva === tab.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                    <tab.icon size={14}/> {tab.label.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 space-y-6 min-w-0">
                  <div className="bg-white rounded-[24px] p-4 lg:p-8 shadow-sm border border-slate-200">
                    {abaAtiva === 'evolucao' && (
                      <input className="w-full text-xl lg:text-3xl font-bold outline-none border-b border-slate-100 pb-3 mb-4 focus:border-blue-600" 
                        placeholder="Título da Evolução..." value={formEvolucao.titulo} onChange={e => setFormEvolucao({...formEvolucao, titulo: e.target.value})} />
                    )}
                    <div className="max-w-full overflow-hidden">
                      <ReactQuill theme="snow" value={abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva]} 
                        onChange={(val) => {
                          if (abaAtiva === 'evolucao') setFormEvolucao(p => ({ ...p, conteudo: val }));
                          else setDocumentos(p => ({ ...p, [abaAtiva]: val }));
                        }} />
                    </div>
                  </div>

                  <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                    <TemplateManager currentType={abaAtiva} onSelectTemplate={(t) => {
                        const renderFn = defaultTemplates[t.tipo];
                        if (typeof renderFn === 'function') {
                            const html = renderFn(pacienteSelecionado, new Date().toLocaleDateString(), userData?.nomeClinica);
                            if (abaAtiva === 'evolucao') setFormEvolucao(p => ({ ...p, conteudo: html }));
                            else setDocumentos(p => ({ ...p, [abaAtiva]: html }));
                        }
                    }} />
                    <ChecklistPanel onSelectChecklist={(c) => {
                        const atual = abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva];
                        const novo = atual + `<p>• ${c}</p>`;
                        if (abaAtiva === 'evolucao') setFormEvolucao(p => ({ ...p, conteudo: novo }));
                        else setDocumentos(p => ({ ...p, [abaAtiva]: novo }));
                    }} />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200">
                    <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={14}/> Histórico</h3>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                      {historico?.map(h => (
                        <div key={h.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="flex justify-between text-[9px] font-bold text-blue-500 uppercase mb-1">
                             <span>{h.tipo}</span>
                             <span>{h.data?.seconds ? new Date(h.data.seconds * 1000).toLocaleDateString() : 'Hoje'}</span>
                           </div>
                           <p className="font-bold text-xs text-slate-800 truncate mb-3">{h.titulo}</p>
                           <button onClick={() => setRegistroVisualizar(h)} className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600">VER REGISTRO</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
              <Stethoscope size={64} className="text-slate-100 mb-4" />
              <p className="text-slate-400 font-bold text-sm">NENHUM PACIENTE SELECIONADO</p>
              <button onClick={() => setSidebarOpen(true)} className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100">ABRIR LISTA</button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {registroVisualizar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
              className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[32px] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">{registroVisualizar.titulo}</h3>
                <button onClick={() => setRegistroVisualizar(null)} className="p-2 bg-white border rounded-xl"><X size={20} /></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 text-slate-700 leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: registroVisualizar.conteudo }} />
              </div>
              <div className="p-4 bg-white border-t">
                <button onClick={() => setRegistroVisualizar(null)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">FECHAR</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}