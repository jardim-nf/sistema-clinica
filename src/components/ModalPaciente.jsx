// src/components/ModalPaciente.jsx - CORRIGIDO: Inicialização de Estado para Evitar Trava (Handle Null/Undefined)

import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, User } from 'lucide-react';
// Se você usa a função mascaraCPF em outro lugar, pode importá-la aqui.
// Por simplicidade, as funções de máscara foram mantidas em Pacientes.jsx.
// Se elas existirem aqui, devem ser verificadas também.

const ModalPaciente = ({ isOpen, onClose, onSave, paciente }) => {
    // Funções de Máscara (Reaplicadas aqui para inputs formatados, se necessário)
    // Se você tem inputs que usam máscara em tempo real, essas funções são cruciais
    const mascaraCPF = (valor) => {
        if (!valor) return '';
        const digits = valor.replace(/\D/g, ''); 
        return digits
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1'); 
    };

    const mascaraTelefone = (valor) => {
        if (!valor) return '';
        const digits = valor.replace(/\D/g, '');
        if (digits.length === 11) { 
            return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        if (digits.length === 10) { 
            return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return valor; 
    };
    
    // --- ESTADO DO FORMULÁRIO (CRÍTICO) ---
    const [formData, setFormData] = useState({
        id: null,
        nome: '',
        cpf: '', // Deve ser string vazia
        email: '', // Deve ser string vazia
        telefone: '', // Deve ser string vazia
        dataNascimento: '', // Deve ser string vazia
        // Adicione outros campos com string vazia aqui:
        // cep: '',
        // endereco: '',
    });
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (isOpen && paciente) {
            // CRÍTICO: Garante que todos os valores de paciente são inicializados
            // mesmo que o Firestore tenha retornado null ou undefined para alguns campos.
            // O Pacientes.jsx já faz a pré-limpeza, mas é bom garantir aqui também.
            setFormData({
                id: paciente.id || null,
                nome: paciente.nome || '',
                cpf: paciente.cpf || '',
                email: paciente.email || '',
                telefone: paciente.telefone || '',
                dataNascimento: paciente.dataNascimento || '',
                // Adicione outros campos aqui:
                // cep: paciente.cep.replace(/\D/g, '') || '', // Se for para remover máscara ao carregar
                // endereco: paciente.endereco || '',
            });
        } else if (isOpen) {
            // Limpa o formulário para um novo cadastro
            setFormData({
                id: null,
                nome: '',
                cpf: '',
                email: '',
                telefone: '',
                dataNascimento: '',
            });
        }
    }, [paciente, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        // Aplica máscara em tempo real para CPF/Telefone no input
        if (name === 'cpf') {
            newValue = mascaraCPF(value);
        } else if (name === 'telefone') {
            newValue = mascaraTelefone(value);
        }

        setFormData({ ...formData, [name]: newValue });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (salvando || !formData.nome || !formData.telefone) return; 

        setSalvando(true);
        
        // Antes de salvar, limpa CPF e Telefone (remove a máscara visual)
        const dataToSave = {
            ...formData,
            cpf: formData.cpf.replace(/\D/g, ''),
            telefone: formData.telefone.replace(/\D/g, ''),
            // Certifique-se de que dataNascimento não é string vazia se o Firestore precisar de null
            // dataNascimento: formData.dataNascimento || null, 
        };

        await onSave(dataToSave);
        setSalvando(false);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* HEADER */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {formData.id ? 'Editar Paciente' : 'Novo Paciente'}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {formData.id ? 'Atualize os dados' : 'Preencha o cadastro'}
                        </p>
                    </div>
                    <button onClick={onClose} disabled={salvando} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    {/* NOME E CPF */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nome Completo</label>
                            <input 
                                type="text" 
                                name="nome"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-indigo-500" 
                                value={formData.nome} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">CPF (Opcional)</label>
                            <input 
                                type="text" 
                                name="cpf"
                                maxLength={14}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-indigo-500" 
                                value={formData.cpf} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>

                    {/* TELEFONE, EMAIL e DATA NASC */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Telefone</label>
                            <input 
                                type="tel" 
                                name="telefone"
                                maxLength={15}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-indigo-500" 
                                value={formData.telefone} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">E-mail</label>
                            <input 
                                type="email" 
                                name="email"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-indigo-500" 
                                value={formData.email} 
                                onChange={handleChange} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Data Nasc.</label>
                            <input 
                                type="date" 
                                name="dataNascimento"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-indigo-500" 
                                value={formData.dataNascimento} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>

                    {/* Endereço (Exemplo de campo extra) */}
                    {/*
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Endereço</label>
                        <input 
                            type="text" 
                            name="endereco"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-indigo-500" 
                            value={formData.endereco} 
                            onChange={handleChange} 
                        />
                    </div>
                    */}

                    {/* BOTÕES */}
                    <div className="pt-4 mt-2 border-t border-slate-100 flex gap-3">
                        <button type="button" onClick={onClose} disabled={salvando} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition">Cancelar</button>
                        <button type="submit" disabled={salvando} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50 transition">
                            {salvando ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                            {formData.id ? 'Salvar Edição' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModalPaciente;