// src/App.jsx - Versão Completa e Final com Layout Restaurado

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// --- COMPONENTES GERAIS ---
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro'; 

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
    // ESTE É UM CÓDIGO EXEMPLO. USE SUA IMPLEMENTAÇÃO ORIGINAL DE RotaPrivada.
    const { user, loading } = useAuth();
    
    // Se ainda estiver carregando, não renderiza nada
    if (loading) return null; 
    
    // Se o usuário estiver autenticado, renderiza os filhos; caso contrário, redireciona
    return user ? children : <Navigate to="/login" replace />;
};

// Componente para gerenciar as rotas internas, onde useAuth é acessível
const RotasInternas = () => {
    const { userData } = useAuth();
    
    // Se o userData ainda não está pronto, mas o RotaPrivada permitiu o acesso (improvável, mas seguro)
    if (!userData) return <Navigate to="/login" replace />; 

    return (
        // LAYOUT RESTAURADO: Se travar, o erro está aqui ou em algo que ele carrega (ex: menu)
        <Layout> 
            <Routes>
                {/* ROTAS PRINCIPAIS: Redirecionamento baseado no papel.
                  Todos os usuários autenticados vão para a rota de dashboard apropriada. 
                */}
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

                {/* Catch-all para rotas não definidas, redirecionando para o Dashboard */}
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

            {/* --- ROTAS PRIVADAS ---
              O path "/*" captura todas as rotas restantes, que são protegidas pela RotaPrivada.
            */}
            <Route path="/*" element={
              <RotaPrivada>
                {/* O RotasInternas lida com o roteamento interno e o Layout */}
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