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
  Stethoscope, ChevronRight, Download, ClipboardList, Search 
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
        <head><style>body { font-family: sans-serif; padding: 40px; font-size: 20px; line-height: 1.6; } .header { text-align: center; border-bottom: 2px solid #3182ce; margin-bottom: 20px; }</style></head>
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
        .ql-editor { font-size: 1.25rem !important; line-height: 1.8 !important; color: #1e293b !important; min-height: 450px; }
        .ql-editor p { margin-bottom: 12px !important; }
        /* Garante que em telas gigantes o editor não fique absurdamente largo e perca a ergonomia */
        .max-content-width { max-width: 1800px; margin: 0 auto; width: 100%; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} 
              className="w-80 2xl:w-96 bg-white border-r flex flex-col shadow-sm shrink-0"
            >
              <div className="p-6 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input type="text" placeholder="Buscar paciente..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" value={busca} onChange={e => setBusca(e.target.value)} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => setPacienteSelecionado(p)} className={`w-full p-4 mb-3 rounded-2xl text-left transition-all ${pacienteSelecionado?.id === p.id ? 'bg-blue-600 text-white shadow-lg translate-x-1' : 'hover:bg-slate-50'}`}>
                    <p className="font-bold text-sm 2xl:text-base truncate">{p.nome}</p>
                    <p className="text-[10px] 2xl:text-xs opacity-60">CPF: {formatarCPF(p.cpf)}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-w-0">
          {pacienteSelecionado ? (
            <>
              <div className="h-20 bg-white border-b px-8 2xl:px-12 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-6">
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500"><ChevronRight className={sidebarOpen ? 'rotate-180' : ''} size={24}/></button>
                  <div className="flex flex-col">
                    <h2 className="font-bold text-slate-800 text-xl 2xl:text-2xl">{pacienteSelecionado.nome}</h2>
                    <span className="text-xs text-slate-400 font-medium tracking-wide">PACIENTE SELECIONADO</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={handleImprimir} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"><Download size={18} /> EXPORTAR PDF</button>
                  <button onClick={handleSalvarRegistro} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all uppercase tracking-wider"><Save size={18} /> Salvar {abaAtiva}</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 2xl:p-12 custom-scrollbar">
                <div className="max-content-width space-y-8">
                  
                  <div className="flex gap-3 bg-white p-2 rounded-2xl border border-slate-100 w-fit shadow-sm">
                    {abas.map(a => (
                      <button key={a.id} onClick={() => setAbaAtiva(a.id)} className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${abaAtiva === a.id ? `${a.bg} ${a.color} shadow-sm ring-1 ring-inset ring-current/10` : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                        <a.icon size={18} /> {a.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Coluna Central/Editor */}
                    <div className="lg:col-span-8 2xl:col-span-9 space-y-8">
                      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[600px]">
                        {abaAtiva === 'evolucao' && (
                          <input className="w-full text-4xl font-extrabold outline-none border-b border-slate-50 pb-4 mb-8 focus:border-blue-500 transition-all placeholder:text-slate-200" placeholder="Título da Evolução..." value={formEvolucao.titulo} onChange={e => setFormEvolucao({...formEvolucao, titulo: e.target.value})} />
                        )}
                        
                        <div className="min-h-[500px]">
                          <ReactQuill 
                            theme="snow" 
                            value={abaAtiva === 'evolucao' ? formEvolucao.conteudo : documentos[abaAtiva]} 
                            onChange={(val) => {
                              if (abaAtiva === 'evolucao') setFormEvolucao(prev => ({ ...prev, conteudo: val }));
                              else setDocumentos(prev => ({ ...prev, [abaAtiva]: val }));
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
                    </div>

                    {/* Coluna Lateral/Histórico */}
                    <div className="lg:col-span-4 2xl:col-span-3">
                      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sticky top-0 h-[calc(100vh-280px)] min-h-[600px]">
                        <h3 className="font-bold text-xs text-slate-400 uppercase mb-8 flex items-center gap-3 tracking-[0.2em]">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                             <Clock size={16}/>
                          </div>
                          Histórico Recente
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                          {historico.map(h => (
                            <div key={h.id} className="p-6 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-blue-100 hover:bg-white transition-all shadow-sm group">
                              <div className="flex justify-between text-[10px] font-bold text-blue-500 uppercase mb-3">
                                <span className="px-2 py-0.5 bg-blue-50 rounded-md tracking-wider">{h.tipo}</span>
                                <span className="text-slate-400 font-medium">{h.data?.seconds ? new Date(h.data.seconds * 1000).toLocaleDateString() : 'Hoje'}</span>
                              </div>
                              <p className="font-bold text-lg text-slate-800 mb-4 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{h.titulo}</p>
                              <button onClick={() => setRegistroVisualizar(h)} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm uppercase tracking-widest">Detalhes</button>
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-200 font-bold bg-white">
              <div className="relative mb-8">
                <Stethoscope size={120} className="opacity-[0.03]" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-24 h-24 bg-slate-50 rounded-full animate-pulse flex items-center justify-center">
                      <Search size={32} className="text-slate-300" />
                   </div>
                </div>
              </div>
              <p className="text-2xl tracking-tighter text-slate-400 uppercase">Selecione um paciente para iniciar</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {registroVisualizar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
              <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">{registroVisualizar.titulo}</h3>
                  <p className="text-sm text-slate-400 flex items-center gap-2 font-medium uppercase tracking-widest">
                    <Clock size={14} /> Registrado em {new Date(registroVisualizar.data?.seconds * 1000).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setRegistroVisualizar(null)} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"><X size={28} /></button>
              </div>
              <div className="p-12 overflow-y-auto flex-1 text-slate-700 text-xl leading-relaxed custom-scrollbar">
                <div className="prose prose-slate prose-xl max-w-none" dangerouslySetInnerHTML={{ __html: registroVisualizar.conteudo }} />
              </div>
              <div className="p-8 bg-slate-50 border-t flex justify-end gap-4">
                <button onClick={() => setRegistroVisualizar(null)} className="px-10 py-4 bg-slate-800 text-white rounded-[1.25rem] font-bold uppercase tracking-widest hover:bg-slate-700 transition-all">Fechar Registro</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}