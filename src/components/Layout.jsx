import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext'; 
import { 
    LayoutDashboard, Calendar, Users, FileText, Settings, LogOut, BarChart, Menu, X, DollarSign,
    Building, Gavel, Loader2, Stethoscope 
} from 'lucide-react'; 

const SidebarItem = ({ icon: Icon, text, to, active, onClick }) => {
    // MUDANÇA: Verde (emerald-600) quando ativo
    const activeClasses = 'bg-emerald-600 text-white shadow-md';
    const inactiveClasses = 'text-slate-600 hover:bg-slate-100 hover:text-slate-800';

    return (
        <Link 
            to={to} 
            onClick={onClick} 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium mb-1 ${active ? activeClasses : inactiveClasses}`}
        >
            <Icon size={20} className={active ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'} />
            <span>{text}</span>
        </Link>
    );
};

const GlobalLoadingScreen = () => (
    // MUDANÇA: Texto verde
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center text-emerald-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        {/* MUDANÇA: Nome Sanus */}
        <h1 className="text-2xl font-extrabold text-slate-800">Sanus</h1>
        <p className="text-sm text-slate-500 mt-2">Carregando Sistema...</p>
    </div>
);

export default function Layout({ children }) {
    const { logout, userData, isLoading } = useAuth(); 
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const allMenuItems = [
        { icon: LayoutDashboard, text: 'Dashboard', path: '/', roles: ['admin', 'secretaria', 'super_admin'] },
        { icon: Calendar, text: 'Agenda', path: '/agenda', roles: ['admin', 'secretaria'] },
        { icon: Users, text: 'Pacientes', path: '/pacientes', roles: ['admin', 'secretaria'] },
        { icon: Stethoscope, text: 'Corpo Clínico', path: '/medicos', roles: ['admin', 'secretaria'] }, 
        { icon: FileText, text: 'Prontuários', path: '/prontuarios', roles: ['admin'] }, 
        { icon: DollarSign, text: 'Financeiro', path: '/financeiro', roles: ['admin'] },
        { icon: BarChart, text: 'Relatórios', path: '/relatorios', roles: ['admin'] },
        { icon: Settings, text: 'Configurações', path: '/config', roles: ['admin'] },
        { icon: Building, text: 'Gestão de Clínicas', path: '/super/clinicas', roles: ['super_admin'] },
        { icon: DollarSign, text: 'Financeiro Geral', path: '/super/financeiro', roles: ['super_admin'] },
        { icon: BarChart, text: 'Relatórios Societários', path: '/super/relatorios', roles: ['super_admin'] },
        { icon: Gavel, text: 'Controle Master', path: '/super/controle', roles: ['super_admin'] }, 
    ];

    const userRole = userData?.role || 'admin'; 
    const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));
    const currentTitle = menuItems.find(i => i.path === location.pathname)?.text || 'Bem-vindo';

    const handleLogout = async () => {
        try { await logout(); navigate('/login'); } catch (error) { console.error("Erro ao sair:", error); }
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'admin': return 'Médico Admin';
            case 'secretaria': return 'Secretária';
            case 'super_admin': return 'Administrador Geral';
            default: return 'Usuário';
        }
    };

    if (isLoading) return <GlobalLoadingScreen />;

    return (
        <div className="flex h-screen w-full bg-slate-50 font-sans">
            {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setMobileMenuOpen(false)} />}

            <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="p-6 h-16 flex items-center justify-between border-b border-slate-100">
                    {/* MUDANÇA: Logo e Texto Verde */}
                    <h1 className="text-xl font-extrabold text-emerald-600 flex items-center gap-2">
                        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-sm font-bold">SN</span> Sanus
                    </h1>
                    <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400"><X size={24}/></button>
                </div>
                
                <nav className="flex-1 p-4 overflow-y-auto">
                    {menuItems.map((item) => (
                        <SidebarItem 
                            key={item.path} 
                            icon={item.icon} 
                            text={item.text} 
                            to={item.path} 
                            active={location.pathname === item.path} 
                            onClick={() => setMobileMenuOpen(false)} 
                        />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="px-4 py-2 mb-2">
                        <span className="text-xs uppercase font-bold text-slate-400">Perfil</span>
                        <p className="text-sm font-bold text-slate-700 capitalize">
                            {getRoleDisplayName(userData?.role)}
                        </p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium">
                        <LogOut size={20} /> <span>Sair</span>
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-h-screen md:pl-64 transition-all duration-300">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden">
                            <Menu size={24} />
                        </button>
                        <h2 className="text-xl font-extrabold text-slate-800">{currentTitle}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* MUDANÇA: Avatar Verde */}
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border border-emerald-200 text-sm md:text-base">SN</div>
                    </div>
                </header>
                <main className="p-4 md:p-8 flex-1 overflow-auto overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}