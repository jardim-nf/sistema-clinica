// src/App.jsx - Versão Completa

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// --- COMPONENTES GERAIS ---
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro'; 
import RecuperarSenha from './pages/RecuperarSenha'; // <--- IMPORTAÇÃO ADICIONADA

// --- IMPORTS DE PÁGINAS DA CLÍNICA ---
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Pacientes from './pages/Pacientes';
import Prontuario from './pages/Prontuario';
import Configuracoes from './pages/Configuracoes';
import Relatorios from './pages/Relatorios'; 
import Financeiro from './pages/Financeiro';

// --- IMPORTS ADMIN (SUPER_ADMIN) ---
import DashboardMaster from './pages/Admin/DashBoardMaster';
import Clinicas from './pages/Admin/Clinicas'; 
import FinanceiroGeral from './pages/Admin/FinanceiroGeral'; 
import RelatoriosSocietarios from './pages/Admin/RelatoriosSocietarios'; 
import ControleMaster from './pages/Admin/ControleMaster'; 

// Componente que protege as rotas privadas
const RotaPrivada = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) return null; 
    
    return user ? children : <Navigate to="/login" replace />;
};

// Componente para gerenciar as rotas internas
const RotasInternas = () => {
    const { userData } = useAuth();
    
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
                <Route path="/financeiro" element={<Financeiro />} />

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
            <Route path="/recuperar-senha" element={<RecuperarSenha />} /> {/* <--- ROTA ADICIONADA */}

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