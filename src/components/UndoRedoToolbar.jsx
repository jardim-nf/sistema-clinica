import React from 'react';
import { Undo, Redo, History } from 'lucide-react';

const UndoRedoToolbar = ({ onUndo, onRedo, canUndo, canRedo, size = 'md' }) => {
  const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-2 text-sm'
  };

  return (
    <div className={`flex items-center gap-1 bg-slate-100 dark:bg-gray-800 rounded-lg ${sizeClasses[size]}`}>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors ${
          !canUndo ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo size={size === 'sm' ? 14 : 16} />
      </button>
      
      <div className="w-px h-4 bg-slate-300 dark:bg-gray-600"></div>
      
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors ${
          !canRedo ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        title="Refazer (Ctrl+Shift+Z)"
      >
        <Redo size={size === 'sm' ? 14 : 16} />
      </button>
    </div>
  );
};

export default UndoRedoToolbar;