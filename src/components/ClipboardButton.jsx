// src/components/ClipboardButton.jsx
import React from 'react';
import { Copy } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const ClipboardButton = ({ text, label = "Copiar", className = "" }) => {
  const { showToast } = useToast();

  const copyToClipboard = async () => {
    if (!text) {
      showToast('Nenhum texto para copiar', 'warning');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copiado para a área de transferência!', 'success');
    } catch (err) {
      showToast('Erro ao copiar', 'error');
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className={`flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition ${className}`}
      type="button"
    >
      <Copy size={16} />
      {label}
    </button>
  );
};

export default ClipboardButton;