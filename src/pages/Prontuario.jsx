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

// Importando com fallbacks para evitar undefined
import * as TemplateData from '../utils/templates';
import * as ChecklistData from '../utils/checklists';

import { 
  Clock, Pill, FileBadge, FileCheck, Save, X,
  Stethoscope, Search, Menu, Download, ClipboardList 
} from 'lucide-react';

export default function ProntuarioAvancado() {
  const { userData } = useAuth();
  const { showToast } = useToast();

  const abas = [
    { id: 'evolucao', label: 'Evolução', icon: ClipboardList },
    { id: 'receita', label: 'Receita', icon: Pill },
    { id: 'atestado', label: 'Atestado', icon: FileBadge },
    { id: 'declaracao', label: 'Declaração', icon: FileCheck }
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
            .then(res => setPacientes(Array.isArray(res) ? res : []))
            .catch(() => setPacientes([]));
    }
  }, [clinicaId]);

  useEffect(() => {
    if (!pacienteSelecionado?.id || !clinicaId) return;
    const q = query(
      collection(db, "prontuarios"),
      where("pacienteId", "==", pacienteSelecionado.id),
      where("clinicaId", "==", clinicaId),
      orderBy("data", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistorico(docs);
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [pacienteSelecionado, clinicaId]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden w-full max-w-[100vw]">
      <style>{`
        .ql-container.ql-snow { border: none !important; }
        .ql-editor { font-size: 16px !important; min-height: 250px !important; }
        .quill { width: 100% !important; }
      `}</style>

      {/* SIDEBAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/50 z-[60] lg:hidden" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="fixed lg:relative inset-y-0 left-0 w-[85%] sm:w-80 bg-white z-[70] flex flex-col border-r">
              <div className="p-4 border-b flex justify-between items-center font-bold">
                <span>Pacientes</span>
                <button onClick={() => setSidebarOpen(false)}><X size={20}/></button>
              </div>
              <div className="p-4 border-b">
                <input type="text" placeholder="Buscar..." className="w-full p-2 bg-slate-100 rounded-lg text-sm outline-none" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => { setPacienteSelecionado(p); setSidebarOpen(false); }} className={`w-full p-4 mb-2 rounded-xl text-left ${pacienteSelecionado?.id === p.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'}`}>
                    <p className="font-bold text-sm truncate">{p.nome}</p>
                    <p className="text-[10px] opacity-70">{p.cpf || '---'}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 lg:hidden"><Menu size={22} /></button>
          <h2 className="font-bold text-slate-800 truncate px-2">{pacienteSelecionado?.nome || "Selecione um paciente"}</h2>
          {pacienteSelecionado && <button onClick={handleSalvarRegistro} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">SALVAR</button>}
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {pacienteSelecionado ? (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* ABAS */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {abas.map(tab => (
                  <button key={tab.id} onClick={() => setAbaAtiva(tab.id)} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border ${abaAtiva === tab.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400'}`}>
                    {tab.label.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 space-y-6">
                  <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border">
                    <ReactQuill theme="snow" value={abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva]} 
                      onChange={(val) => {
                        if (abaAtiva === 'evolucao') setFormEvolucao(p => ({ ...p, conteudo: val }));
                        else setDocumentos(p => ({ ...p, [abaAtiva]: val }));
                      }} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PROTEÇÃO CONTRA UNDEFINED NAS PROPS */}
                    <TemplateManager 
                      templates={TemplateData.templates || []} 
                      onSelectTemplate={(t) => {
                        const renderFn = TemplateData.defaultTemplates?.[t?.tipo];
                        if (typeof renderFn === 'function') {
                          const html = renderFn(pacienteSelecionado, new Date().toLocaleDateString(), userData?.nomeClinica);
                          if (abaAtiva === 'evolucao') setFormEvolucao(p => ({ ...p, conteudo: html }));
                          else setDocumentos(p => ({ ...p, [abaAtiva]: html }));
                        }
                      }}
                    />
                    <ChecklistPanel 
                      checklists={ChecklistData.checklists || []} 
                      onSelectChecklist={(c) => {
                        const atual = abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva];
                        if (abaAtiva === 'evolucao') setFormEvolucao(p => ({ ...p, conteudo: atual + `<p>• ${c}</p>` }));
                        else setDocumentos(p => ({ ...p, [abaAtiva]: atual + `<p>• ${c}</p>` }));
                      }}
                    />
                  </div>
                </div>

                {/* HISTÓRICO */}
                <div className="xl:col-span-1">
                  <div className="bg-white rounded-3xl p-6 shadow-sm border">
                    <h3 className="font-bold text-xs text-slate-400 uppercase mb-4 flex items-center gap-2"><Clock size={14}/> Histórico</h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {historico.map(h => (
                        <div key={h.id} className="p-3 bg-slate-50 rounded-xl border">
                          <p className="font-bold text-xs truncate">{h.titulo}</p>
                          <p className="text-[10px] text-slate-400 mb-2">{h.data?.seconds ? new Date(h.data.seconds * 1000).toLocaleDateString() : '---'}</p>
                          <button onClick={() => setRegistroVisualizar(h)} className="w-full py-1 bg-white border rounded-lg text-[10px] font-bold">VER</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Stethoscope size={48} className="mb-2 opacity-20" />
              <p className="font-bold">Selecione um paciente para iniciar</p>
            </div>
          )}
        </div>
      </div>
      
      {/* MODAL DETALHES */}
      <AnimatePresence>
        {registroVisualizar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold">{registroVisualizar.titulo}</h3>
                <button onClick={() => setRegistroVisualizar(null)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 text-sm leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: registroVisualizar.conteudo }} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}