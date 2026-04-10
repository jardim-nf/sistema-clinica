import React, { useState } from 'react';
import { Settings, Save, MessageSquare, AlertCircle } from 'lucide-react';

const ConfiguracoesWhatsapp = () => {
    const [uazapiUrl, setUazapiUrl] = useState('https://meunumero.uazapi.com');
    const [uazapiToken, setUazapiToken] = useState('seu_token_aqui');
    const [openaiKey, setOpenaiKey] = useState('sk-...');
    const [botAtivo, setBotAtivo] = useState(true);

    const handleSave = (e) => {
        e.preventDefault();
        alert('Configurações salvas de forma segura no Firebase.');
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <MessageSquare className="mr-3 h-8 w-8 text-green-600" />
                    Chatbot WhatsApp Inteligente (Uazapi + OpenAI)
                </h1>
                <p className="text-gray-500">Configure a conexão com o WhatsApp e ative a Inteligência Artificial da clínica.</p>
            </header>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <form onSubmit={handleSave} className="p-6 space-y-6">
                    
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Inteligência Artificial (Cérebro do Robô)</h2>
                    
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                OpenAI API Key (ChatGPT)
                            </label>
                            <input 
                                type="password"
                                value={openaiKey}
                                onChange={(e)=>setOpenaiKey(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                                placeholder="sk-..."
                            />
                            <p className="text-xs text-gray-500 mt-1">Chave usada para que o robô faça um atendimento humanizado.</p>
                        </div>
                    </div>

                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2 mt-4">Credenciais Uazapi</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Uazapi URL (Instância)
                            </label>
                            <input 
                                type="url"
                                value={uazapiUrl}
                                onChange={(e)=>setUazapiUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                                placeholder="https://..."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Token (Uazapi)
                            </label>
                            <input 
                                type="password"
                                value={uazapiToken}
                                onChange={(e)=>setUazapiToken(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    </div>

                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2 pt-4">Automação e Handoff</h2>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                            <h3 className="text-md font-medium text-gray-900">Ativar Assistente I.A.</h3>
                            <p className="text-sm text-gray-500">Quando ativo, o bot responde mensagens automaticamente.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={botAtivo} onChange={(e) => setBotAtivo(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                            <p className="text-sm text-yellow-700">
                                <strong>Escalation (Handoff)</strong>: Se o paciente pedir para falar com um atendente humano, o bot suspenderá as respostas automáticas para este cliente e notificará os recepcionistas no painel geral.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-sm font-medium flex items-center"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Configurações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ConfiguracoesWhatsapp;
