// useAutoSave.js - VERSÃO CORRIGIDA
import { useState, useEffect, useCallback, useRef } from 'react';

const useAutoSave = ({ 
  data, 
  pacienteId, 
  userId, 
  onSave, 
  debounceTime = 2000 
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timeoutRef = useRef(null);
  const prevDataRef = useRef(null);

  // Função de salvamento memoizada
  const saveData = useCallback(async () => {
    if (!pacienteId || !userId || !data) return;
    
    // Verificar se os dados realmente mudaram
    if (JSON.stringify(data) === JSON.stringify(prevDataRef.current)) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(data);
      prevDataRef.current = data;
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erro no auto-save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [data, pacienteId, userId, onSave]);

  // Efeito principal com debounce
  useEffect(() => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Configurar novo timeout
    timeoutRef.current = setTimeout(() => {
      saveData();
    }, debounceTime);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [saveData, debounceTime]); // Apenas saveData e debounceTime

  return { isSaving, lastSaved };
};

export default useAutoSave;