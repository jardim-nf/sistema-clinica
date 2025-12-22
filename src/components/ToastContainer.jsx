import React from 'react';
import './ToastContainer.css';

// Agora recebe as funções e dados via props, tornando-o reutilizável pelo Contexto
const ToastContainer = ({ toasts, removeToast }) => {
  const getIconByType = (type) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'i';
      default: return 'ℹ';
    }
  };

  const getClassNameByType = (type) => {
    return `toast toast-${type}`;
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container top-right">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={getClassNameByType(toast.type)}
          onClick={() => removeToast(toast.id)}
        >
          <div className="toast-header">
            <span className="toast-icon">{getIconByType(toast.type)}</span>
            {toast.title && <strong className="toast-title">{toast.title}</strong>}
            <button 
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              ×
            </button>
          </div>
          <div className="toast-body">{toast.message}</div>
          <div 
            className="toast-progress" 
            style={{ 
              animationDuration: `${toast.duration}ms` 
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;