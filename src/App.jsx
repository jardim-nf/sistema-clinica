// src/App.jsx - Versão Corrigida

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// --- COMPONENTES GERAIS ---
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro'; 
import RecuperarSenha from './pages/RecuperarSenha';
import AgendamentoOnline from './pages/AgendamentoOnline';

// --- IMPORTS DE PÁGINAS DA CLÍNICA ---
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Pacientes from './pages/Pacientes';
import Prontuario from './pages/Prontuario';
import Configuracoes from './pages/Configuracoes';
import ConfiguracoesWhatsapp from './pages/ConfiguracoesWhatsapp';
import Relatorios from './pages/Relatorios'; 
import Financeiro from './pages/Financeiro';
import Medicos from './pages/Medicos'; // <--- IMPORTAÇÃO QUE FALTAVA

// --- IMPORTS ADMIN (SUPER_ADMIN) ---
import DashboardMaster from './pages/Admin/DashBoardMaster';
import Clinicas from './pages/Admin/Clinicas'; 
import FinanceiroGeral from './pages/Admin/FinanceiroGeral'; 
import RelatoriosSocietarios from './pages/Admin/RelatoriosSocietarios'; 
import ControleMaster from './pages/Admin/ControleMaster'; 

// Componente que protege as rotas privadas
const RotaPrivada = ({ children }) => {
    const { user } = useAuth();
    
    return user ? children : <Navigate to="/login" replace />;
};

// Componente para gerenciar as rotas internas
const RotasInternas = () => {
    const { user, userData } = useAuth();
    
    // Se temos o user do auth mas ainda estamos buscando os dados do firestore (userData), aguarde
    if (user && !userData) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-blue-600 bg-slate-50 gap-4">
                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                <p className="font-semibold">Preparando ambiente...</p>
            </div>
        );
    }
    
    if (!userData) return <Navigate to="/login" replace />;

    return (
        <Layout> 
            <Routes>
                {/* ROTAS PRINCIPAIS */}
                <Route path="/" element={
                    userData.role === 'super_admin' ? 
                    <DashboardMaster /> : 
                    <Dashboard />
                } />
                
                {/* ROTAS GERAIS DA CLÍNICA */}
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/pacientes" element={<Pacientes />} />
                <Route path="/prontuarios" element={<Prontuario />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/config" element={<Configuracoes />} />
                <Route path="/whatsapp" element={<ConfiguracoesWhatsapp />} />
                <Route path="/financeiro" element={<Financeiro />} />
                
                {/* ROTA DE MÉDICOS (Corrigida: sem wrapper redundante) */}
                <Route path="/medicos" element={<Medicos />} /> 

                {/* ROTAS DO ADMINISTRADOR GERAL (SUPER_ADMIN) */}
                <Route path="/super/clinicas" element={<Clinicas />} />
                <Route path="/super/financeiro" element={<FinanceiroGeral />} />
                <Route path="/super/relatorios" element={<RelatoriosSocietarios />} />
                <Route path="/super/controle" element={<ControleMaster />} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
};


function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* --- ROTAS PÚBLICAS --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} /> 
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/agendar/:clinicaId" element={<AgendamentoOnline />} />

            {/* --- ROTAS PRIVADAS --- */}
            <Route path="/*" element={
              <RotaPrivada>
                <RotasInternas /> 
              </RotaPrivada>
            } />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;