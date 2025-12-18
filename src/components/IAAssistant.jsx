import React, { useState } from 'react';
import { Brain, Zap, Sparkles, X, Loader2 } from 'lucide-react';

const IAAssistant = ({ onGetSuggestions, loading, suggestions, onApplySuggestion }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const handleGetSuggestions = () => {
    setIsOpen(true);
    onGetSuggestions?.();
  };

  const handleApplySuggestion = (suggestion) => {
    onApplySuggestion?.(suggestion);
    setIsOpen(false);
    setSelectedSuggestion(null);
  };

  return (
    <>
      <button
        onClick={handleGetSuggestions}
        disabled={loading}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
          loading 
            ? 'bg-amber-100 text-amber-800 cursor-wait' 
            : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            <span>Processando...</span>
          </>
        ) : (
          <>
            <Brain size={16} />
            <span>Assistente IA</span>
          </>
        )}
      </button>

      {/* Modal de Sugestões */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                  <Brain size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Assistente IA</h3>
                  <p className="text-sm text-slate-500">Sugestões baseadas no seu texto</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="animate-spin mx-auto mb-4 text-purple-600" size={32} />
                  <p className="text-slate-500">Analisando texto e gerando sugestões...</p>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedSuggestion === index
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-slate-200 dark:border-gray-700 hover:border-purple-300'
                      }`}
                      onClick={() => setSelectedSuggestion(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                          <Sparkles size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Zap className="mx-auto mb-4 text-slate-300" size={32} />
                  <p className="text-slate-500">Digite mais texto para obter sugestões da IA</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 border py-3 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (selectedSuggestion !== null) {
                    handleApplySuggestion(suggestions[selectedSuggestion]);
                  }
                }}
                disabled={selectedSuggestion === null}
                className={`flex-1 py-3 rounded-lg ${
                  selectedSuggestion !== null
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Aplicar Sugestão
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IAAssistant;