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
  Stethoscope, ChevronRight, Download, ClipboardList, Search, Menu
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
  }, [pacienteSelecionado, meuUsuarioId]);

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
    <div className="h-[calc(100vh-80px)] bg-slate-50 flex flex-col overflow-hidden relative">
      <style>{`
        .ql-editor { font-size: 18px !important; line-height: 1.6 !important; color: #1e293b !important; min-height: 350px; }
        @media (min-width: 1024px) { .ql-editor { font-size: 20px !important; min-height: 450px; } }
        .ql-editor p { margin-bottom: 12px !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR RESPONSIVA */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Overlay para fechar no mobile ao clicar fora */}
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
              />
              <motion.div 
                initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
                className="fixed lg:relative inset-y-0 left-0 w-80 bg-white border-r flex flex-col shadow-2xl lg:shadow-none z-50"
              >
                <div className="p-4 border-b flex justify-between items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input type="text" placeholder="Buscar paciente..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none" value={busca} onChange={e => setBusca(e.target.value)} />
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="ml-2 p-2 lg:hidden text-slate-400"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => (
                    <button key={p.id} onClick={() => { setPacienteSelecionado(p); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full p-4 mb-2 rounded-2xl text-left transition-all ${pacienteSelecionado?.id === p.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50'}`}>
                      <p className="font-bold text-sm truncate">{p.nome}</p>
                      <p className="text-[10px] opacity-60">CPF: {formatarCPF(p.cpf)}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {pacienteSelecionado ? (
            <>
              {/* HEADER SUPERIOR */}
              <div className="h-auto min-h-[64px] bg-white border-b px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  {!sidebarOpen && (
                    <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-50 rounded-xl bg-blue-50 text-blue-600">
                      <Menu size={20}/>
                    </button>
                  )}
                  <h2 className="font-bold text-slate-800 text-base lg:text-lg truncate max-w-[180px] sm:max-w-none">
                    {pacienteSelecionado.nome}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleImprimir} className="p-2.5 lg:px-4 lg:py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
                    <Download size={16} /> <span className="hidden sm:inline">PDF</span>
                  </button>
                  <button onClick={handleSalvarRegistro} className="p-2.5 lg:px-4 lg:py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all">
                    <Save size={16} /> <span className="hidden sm:inline">SALVAR {abaAtiva.toUpperCase()}</span>
                  </button>
                </div>
              </div>

              {/* ÁREA DE TRABALHO */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
                {/* ABAS COM SCROLL HORIZONTAL NO MOBILE */}
                <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 w-full lg:w-fit shadow-sm overflow-x-auto no-scrollbar">
                  {abas.map(a => (
                    <button key={a.id} onClick={() => setAbaAtiva(a.id)} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${abaAtiva === a.id ? `${a.bg} ${a.color} shadow-sm ring-1 ring-inset ring-current/10` : 'text-slate-400 hover:text-slate-600'}`}>
                      <a.icon size={16} /> {a.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
                  {/* COLUNA DO EDITOR */}
                  <div className="xl:col-span-3 space-y-6">
                    <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm">
                      {abaAtiva === 'evolucao' && (
                        <input className="w-full text-xl lg:text-3xl font-bold outline-none border-b pb-2 mb-4 focus:border-blue-500 transition-all" placeholder="Título da Evolução..." value={formEvolucao.titulo} onChange={e => setFormEvolucao({...formEvolucao, titulo: e.target.value})} />
                      )}
                      
                      <div className="min-h-[350px] lg:min-h-[450px]">
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
                    
                    {/* BOTÕES DE AUXÍLIO - EMPILHADOS NO MOBILE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
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

                  {/* HISTÓRICO - LADO DIREITO (OU ABAIXO NO MOBILE) */}
                  <div className="bg-white p-6 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[500px] lg:h-[800px]">
                    <h3 className="font-bold text-[10px] text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-widest"><Clock size={16}/> Histórico</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      {historico.length === 0 && <p className="text-center text-slate-300 text-xs py-10">Nenhum registro encontrado</p>}
                      {historico.map(h => (
                        <div key={h.id} className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all shadow-sm">
                          <div className="flex justify-between text-[10px] font-bold text-blue-500 uppercase mb-2">
                            <span>{h.tipo}</span>
                            <span>{h.data?.seconds ? new Date(h.data.seconds * 1000).toLocaleDateString() : 'Hoje'}</span>
                          </div>
                          <p className="font-bold text-sm text-slate-800 mb-2 truncate">{h.titulo}</p>
                          <button onClick={() => setRegistroVisualizar(h)} className="w-full py-2 bg-white border rounded-xl text-[10px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm">VER DETALHES</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 font-bold bg-white p-6 text-center">
              <Stethoscope size={64} className="mb-4 opacity-5" /> 
              <p>SELECIONE UM PACIENTE NA LISTA PARA COMEÇAR</p>
              <button onClick={() => setSidebarOpen(true)} className="mt-4 lg:hidden px-6 py-2 bg-blue-600 text-white rounded-full text-sm">Abrir Lista</button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO RESPONSIVO */}
      <AnimatePresence>
        {registroVisualizar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} 
              className="bg-white w-full max-w-3xl h-full sm:h-auto max-h-screen sm:max-h-[90vh] rounded-none sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 lg:p-8 border-b flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-slate-800">{registroVisualizar.titulo}</h3>
                  <p className="text-[10px] lg:text-xs text-slate-400">Registrado em {new Date(registroVisualizar.data?.seconds * 1000).toLocaleString()}</p>
                </div>
                <button onClick={() => setRegistroVisualizar(null)} className="p-2 lg:p-3 bg-white border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
              </div>
              <div className="p-6 lg:p-10 overflow-y-auto flex-1 text-slate-700 text-base lg:text-[20px] leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: registroVisualizar.conteudo }} />
              </div>
              <div className="p-4 lg:p-6 bg-slate-50 border-t flex justify-end">
                <button onClick={() => setRegistroVisualizar(null)} className="w-full sm:w-auto px-8 py-3 bg-slate-800 text-white rounded-2xl font-bold">FECHAR</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}