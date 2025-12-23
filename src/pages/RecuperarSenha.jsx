import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Mail, ArrowLeft } from 'lucide-react';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await resetPassword(email);
      showToast('E-mail de recuperação enviado! Verifique sua caixa de entrada (e spam).', 'success');
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      let message = 'Falha ao enviar e-mail.';
      if (error.code === 'auth/user-not-found') {
        message = 'E-mail não encontrado no sistema.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Formato de e-mail inválido.';
      }
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 space-y-8">
        <div className="text-center">
          {/* MUDANÇA: Texto verde */}
          <h1 className="text-3xl font-extrabold text-emerald-600">Recuperar Senha</h1>
          <p className="mt-2 text-slate-600">Digite seu e-mail para receber as instruções.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">E-mail cadastrado</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // MUDANÇA: Focus ring verde
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 transition duration-150"
              placeholder="seu.email@exemplo.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            // MUDANÇA: Botão verde
            className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-lg text-white font-semibold transition duration-150 ease-in-out ${
              loading 
                ? 'bg-emerald-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {loading ? 'Enviando...' : (
              <>
                <Mail size={20} /> Enviar Link
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} /> Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}