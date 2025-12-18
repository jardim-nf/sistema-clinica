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
  Clock, Pill, FileBadge, FileCheck, Save, Eye, X,
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
        .ql-editor { font-size: 20px !important; line-height: 1.8 !important; color: #1e293b !important; min-height: 450px; }
        .ql-editor p { margin-bottom: 12px !important; }
      `}</style>

      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="w-80 bg-white border-r flex flex-col shadow-sm">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input type="text" placeholder="Buscar paciente..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none" value={busca} onChange={e => setBusca(e.target.value)} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => setPacienteSelecionado(p)} className={`w-full p-4 mb-2 rounded-2xl text-left transition-all ${pacienteSelecionado?.id === p.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50'}`}>
                    <p className="font-bold text-sm truncate">{p.nome}</p>
                    <p className="text-[10px] opacity-60">CPF: {formatarCPF(p.cpf)}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-w-0">
          {pacienteSelecionado ? (
            <>
              <div className="h-16 bg-white border-b px-8 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><ChevronRight className={sidebarOpen ? 'rotate-180' : ''} size={20}/></button>
                  <h2 className="font-bold text-slate-800 text-lg">{pacienteSelecionado.nome}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleImprimir} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"><Download size={14} /> PDF</button>
                  <button onClick={handleSalvarRegistro} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all"><Save size={14} /> SALVAR {abaAtiva.toUpperCase()}</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 w-fit shadow-sm">
                  {abas.map(a => (
                    <button key={a.id} onClick={() => setAbaAtiva(a.id)} className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${abaAtiva === a.id ? `${a.bg} ${a.color} shadow-sm ring-1 ring-inset ring-current/10` : 'text-slate-400 hover:text-slate-600'}`}>
                      <a.icon size={16} /> {a.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                  <div className="xl:col-span-3 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[550px]">
                      {abaAtiva === 'evolucao' && (
                        <input className="w-full text-3xl font-bold outline-none border-b pb-2 mb-4 focus:border-blue-500 transition-all" placeholder="Título da Evolução..." value={formEvolucao.titulo} onChange={e => setFormEvolucao({...formEvolucao, titulo: e.target.value})} />
                      )}
                      
                      <div className="min-h-[450px]">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[800px]">
                    <h3 className="font-bold text-[10px] text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-widest"><Clock size={16}/> Histórico</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      {historico.map(h => (
                        <div key={h.id} className="p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all shadow-sm">
                          <div className="flex justify-between text-[10px] font-bold text-blue-500 uppercase mb-2">
                            <span>{h.tipo}</span>
                            <span>{h.data?.seconds ? new Date(h.data.seconds * 1000).toLocaleDateString() : 'Hoje'}</span>
                          </div>
                          <p className="font-bold text-[16px] text-slate-800 mb-2 truncate">{h.titulo}</p>
                          <button onClick={() => setRegistroVisualizar(h)} className="w-full py-2 bg-white border rounded-xl text-[12px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm">VER DETALHES</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 font-bold bg-white">
              <Stethoscope size={64} className="mb-4 opacity-5" /> 
              <p>SELECIONE UM PACIENTE</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {registroVisualizar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">{registroVisualizar.titulo}</h3>
                  <p className="text-xs text-slate-400">Registrado em {new Date(registroVisualizar.data?.seconds * 1000).toLocaleString()}</p>
                </div>
                <button onClick={() => setRegistroVisualizar(null)} className="p-3 bg-white border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"><X size={24} /></button>
              </div>
              <div className="p-10 overflow-y-auto flex-1 text-slate-700 text-[20px] leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: registroVisualizar.conteudo }} />
              </div>
              <div className="p-6 bg-slate-50 border-t flex justify-end">
                <button onClick={() => setRegistroVisualizar(null)} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-bold">FECHAR</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}