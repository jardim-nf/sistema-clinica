import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building2, ArrowRight, Loader2 } from 'lucide-react';

export default function Cadastro() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  
  const { signup } = useAuth(); // Pega a função do passo 1
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault(); // Impede a página de recarregar
    console.log("Botão de cadastrar clicado!"); // TESTE

    setErro('');
    setLoading(true);

    try {
      console.log("Chamando função signup...");
      // Tenta criar a conta
      await signup(email, password, nome, 'admin');
      
      console.log("Sucesso! Redirecionando...");
      navigate('/'); // Vai para o Dashboard
    } catch (error) {
      console.error("Erro no cadastro:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        setErro('Este e-mail já está em uso.');
      } else if (error.code === 'auth/weak-password') {
        setErro('A senha é muito fraca (mínimo 6 dígitos).');
      } else if (error.code === 'auth/network-request-failed') {
        setErro('Sem internet. Verifique sua conexão.');
      } else {
        setErro('Erro ao criar conta: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Building2 className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Nova Clínica</h2>
          <p className="text-blue-100 mt-2">Crie sua conta de administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {erro && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center font-medium">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Nome da Clínica</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all bg-slate-50 focus:bg-white"
                placeholder="Ex: Clínica Saúde"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all bg-slate-50 focus:bg-white"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                required
                autoComplete="new-password"
                className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all bg-slate-50 focus:bg-white"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Criar Conta <ArrowRight size={20} /></>}
          </button>
        </form>

        <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
          <p className="text-slate-500 text-sm">
            Já tem conta?{' '}
            <Link to="/login" className="text-blue-600 font-bold hover:underline">
              Fazer Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}