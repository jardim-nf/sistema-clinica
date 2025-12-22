import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, Hash, Calendar, ShieldCheck } from 'lucide-react';

export default function ModalPaciente({ isOpen, onClose, onSave, paciente }) {
  // Estado inicial do formulário
  const initialFormState = {
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    genero: 'nao_informado',
    status: 'ativo',
    observacoes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (paciente) {
        setFormData({
          ...initialFormState,
          ...paciente,
          email: paciente.email || '',
          cpf: mascaraCPF(paciente.cpf || ''),
          telefone: mascaraTelefone(paciente.telefone || '')
        });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
    }
  }, [isOpen, paciente]);

  // --- MÁSCARAS ---
  const mascaraCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const mascaraTelefone = (value) => {
    let r = value.replace(/\D/g, "");
    r = r.replace(/^0/, "");
    if (r.length > 10) {
      r = r.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (r.length > 5) {
      r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (r.length > 2) {
      r = r.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
    } else {
      r = r.replace(/^(\d*)/, "($1");
    }
    return r;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let novoValor = value;

    if (name === 'cpf') novoValor = mascaraCPF(value);
    if (name === 'telefone') novoValor = mascaraTelefone(value);

    setFormData(prev => ({ ...prev, [name]: novoValor }));
    
    // Limpa erro ao digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // --- VALIDAÇÃO E ENVIO ---
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};

    // 1. Nome Obrigatório
    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }

    // 2. Telefone Obrigatório
    if (!formData.telefone.trim()) {
      newErrors.telefone = "Telefone é obrigatório";
    }
    
    // 3. CPF Obrigatório e com 11 dígitos
    const cpfLimpo = formData.cpf.replace(/\D/g, '');
    if (!cpfLimpo) {
      newErrors.cpf = "CPF é obrigatório";
    } else if (cpfLimpo.length !== 11) {
      newErrors.cpf = "CPF incompleto (digite 11 números)";
    }

    // Se houver erros, para aqui
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Envia dados limpos
    onSave({
      ...formData,
      cpf: formData.cpf.replace(/\D/g, ''),
      telefone: formData.telefone.replace(/\D/g, '')
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {paciente ? 'Editar Paciente' : 'Novo Paciente'}
            </h2>
            <p className="text-sm text-slate-500">
              {paciente ? 'Atualize os dados abaixo' : 'Preencha as informações para cadastro'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="pacienteForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nome */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-700">Nome Completo *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.nome ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'} rounded-xl focus:outline-none focus:ring-4 transition-all`}
                  placeholder="Ex: João da Silva"
                />
              </div>
              {errors.nome && <p className="text-xs text-red-500 font-medium">{errors.nome}</p>}
            </div>

            {/* CPF (AGORA OBRIGATÓRIO) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">CPF *</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  maxLength={14}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.cpf ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'} rounded-xl focus:outline-none focus:ring-4 transition-all`}
                  placeholder="000.000.000-00"
                />
              </div>
              {errors.cpf && <p className="text-xs text-red-500 font-medium">{errors.cpf}</p>}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Telefone / WhatsApp *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  maxLength={15}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.telefone ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'} rounded-xl focus:outline-none focus:ring-4 transition-all`}
                  placeholder="(00) 00000-0000"
                />
              </div>
              {errors.telefone && <p className="text-xs text-red-500 font-medium">{errors.telefone}</p>}
            </div>

            {/* Email */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-700">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all"
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>

            {/* Data Nascimento */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Data de Nascimento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="date"
                  name="dataNascimento"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all text-slate-600"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all appearance-none text-slate-600"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            {/* Observações */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-700">Observações</label>
              <textarea
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                rows="3"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all resize-none"
                placeholder="Histórico médico breve ou observações importantes..."
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 hover:text-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="pacienteForm"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
          >
            <Save size={18} />
            {paciente ? 'Salvar Alterações' : 'Cadastrar Paciente'}
          </button>
        </div>

      </div>
    </div>
  );
}