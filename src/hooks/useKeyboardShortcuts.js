import { useEffect } from 'react';

const useKeyboardShortcuts = (handlers) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S / Cmd+S para salvar
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handlers.onSave?.();
      }
      
      // Ctrl+F / Cmd+F para buscar
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        handlers.onSearch?.();
      }
      
      // Ctrl+Z / Cmd+Z para undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handlers.onUndo?.();
      }
      
      // Ctrl+Shift+Z / Cmd+Shift+Z para redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handlers.onRedo?.();
      }
      
      // Ctrl+Y para redo (alternativo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handlers.onRedo?.();
      }
      
      // Esc para limpar
      if (e.key === 'Escape') {
        handlers.onClear?.();
      }
      
      // Ctrl+P para imprimir
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlers.onPrint?.();
      }
      
      // Ctrl+N para novo documento
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handlers.onNewDocument?.();
      }
      
      // Ctrl+D para dark mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handlers.onToggleDarkMode?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);

  return {
    addShortcut: (key, handler) => {
      // Implementação para adicionar shortcuts dinamicamente
    }
  };
};

export default useKeyboardShortcuts;