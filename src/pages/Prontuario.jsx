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
  Stethoscope, Download, ClipboardList, Search, Menu
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
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile: começa fechado
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

  return (
    // Removido overflow-hidden do container pai para permitir scroll natural no mobile se necessário
    <div className="min-h-screen bg-slate-50 flex flex-col relative max-w-[100vw] overflow-x-hidden">
      <style>{`
        /* Ajuste crucial para o Quill não vazar a largura */
        .quill { width: 100% !important; display: flex; flex-direction: column; }
        .ql-container { width: 100% !important; font-size: 16px !important; }
        .ql-editor { font-size: 16px !important; line-height: 1.5 !important; padding: 12px !important; min-height: 300px; }
        
        @media (min-width: 1024px) { 
          .ql-editor { font-size: 18px !important; min-height: 450px; padding: 20px !important; } 
        }

        /* Esconder toolbar excessiva no mobile */
        @media (max-width: 640px) {
          .ql-toolbar.ql-snow { display: flex; flex-wrap: wrap; padding: 4px !important; }
          .ql-formats { margin-right: 4px !important; }
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="flex flex-1 relative max-w-full">
        {/* SIDEBAR RESPONSIVA - Usando fixed para garantir que não empurre o conteúdo no mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
              />
              <motion.div 
                initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
                className="fixed lg:sticky top-0 left-0 h-screen w-[280px] sm:w-80 bg-white border-r flex flex-col z-[70] shadow-2xl lg:shadow-none"
              >
                <div className="p-4 border-b flex justify-between items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none" value={busca} onChange={e => setBusca(e.target.value)} />
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="ml-2 p-2 lg:hidden text-slate-400"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {pacientes.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map(p => (
                    <button key={p.id} onClick={() => { setPacienteSelecionado(p); setSidebarOpen(false); }} className={`w-full p-4 mb-2 rounded-2xl text-left transition-all ${pacienteSelecionado?.id === p.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50'}`}>
                      <p className="font-bold text-sm truncate">{p.nome}</p>
                      <p className="text-[10px] opacity-60 uppercase">{formatarCPF(p.cpf)}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {pacienteSelecionado ? (
            <>
              {/* HEADER SUPERIOR - Fixado no topo para mobile */}
              <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600 flex-shrink-0">
                    <Menu size={20}/>
                  </button>
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base truncate">
                    {pacienteSelecionado.nome}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={handleSalvarRegistro} className="bg-blue-600 text-white p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                    <Save size={16} /> <span className="hidden sm:inline">SALVAR</span>
                  </button>
                </div>
              </div>

              {/* ÁREA DE TRABALHO */}
              <div className="p-4 sm:p-6 space-y-4 max-w-full overflow-x-hidden">
                {/* ABAS COM SCROLL HORIZONTAL DISCRETO */}
                <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar touch-pan-x">
                  {abas.map(a => (
                    <button key={a.id} onClick={() => setAbaAtiva(a.id)} className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${abaAtiva === a.id ? `${a.bg} ${a.color} shadow-sm` : 'text-slate-400'}`}>
                      <a.icon size={14} /> {a.label}
                    </button>
                  ))}
                </div>

                {/* GRID PRINCIPAL - Sempre 1 coluna no mobile */}
                <div className="flex flex-col xl:flex-row gap-6">
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      {abaAtiva === 'evolucao' && (
                        <input className="w-full text-lg sm:text-2xl font-bold outline-none border-b pb-2 mb-4" placeholder="Título..." value={formEvolucao.titulo} onChange={e => setFormEvolucao({...formEvolucao, titulo: e.target.value})} />
                      )}
                      <div className="max-w-full overflow-hidden">
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
                    
                    {/* AUXILIARES - Empilhados no mobile */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TemplateManager currentType={abaAtiva} onSelectTemplate={(t) => {/* lógica */}} />
                      <ChecklistPanel onSelectChecklist={(c) => {/* lógica */}} />
                    </div>
                  </div>

                  {/* HISTÓRICO - Aparece abaixo no mobile */}
                  <div className="w-full xl:w-80 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-[10px] text-slate-400 uppercase mb-4 flex items-center gap-2"><Clock size={14}/> Histórico Recente</h3>
                    <div className="space-y-3">
                      {historico.slice(0, 5).map(h => (
                        <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-transparent">
                          <div className="flex justify-between text-[9px] font-bold text-blue-500 uppercase mb-1">
                            <span>{h.tipo}</span>
                            <span>{h.data?.seconds ? new Date(h.data.seconds * 1000).toLocaleDateString() : 'Hoje'}</span>
                          </div>
                          <p className="font-bold text-xs text-slate-800 truncate">{h.titulo}</p>
                          <button onClick={() => setRegistroVisualizar(h)} className="mt-2 w-full py-1.5 bg-white border rounded-lg text-[10px] font-bold text-slate-600">VER</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <Stethoscope size={48} className="mb-4 text-slate-200" /> 
              <p className="text-slate-400 font-bold text-sm">SELECIONE UM PACIENTE</p>
              <button onClick={() => setSidebarOpen(true)} className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg">ABRIR LISTA</button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO - Fullscreen no mobile */}
      <AnimatePresence>
        {registroVisualizar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
              className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-slate-800 truncate pr-4">{registroVisualizar.titulo}</h3>
                <button onClick={() => setRegistroVisualizar(null)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 text-sm sm:text-base leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: registroVisualizar.conteudo }} />
              </div>
              <div className="p-4 bg-slate-50 border-t">
                <button onClick={() => setRegistroVisualizar(null)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">FECHAR</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}