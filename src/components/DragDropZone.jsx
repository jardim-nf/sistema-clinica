import React, { useState, useCallback } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const DragDropZone = ({ 
  children, 
  onFilesDrop, 
  accept = '*/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [rejectedFiles, setRejectedFiles] = useState([]);
  const { showToast } = useToast();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file) => {
    const errors = [];
    
    // Verificar tamanho
    if (file.size > maxSize) {
      errors.push(`Tamanho máximo: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
    }
    
    // Verificar tipo (se accept não for */*)
    if (accept !== '*/*') {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileType = file.type || `application/${file.name.split('.').pop()}`;
      
      if (!acceptedTypes.some(type => {
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return fileType.startsWith(baseType);
        }
        return type === fileType;
      })) {
        errors.push('Tipo de arquivo não suportado');
      }
    }
    
    return errors;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = [];
      const rejected = [];
      
      Array.from(e.dataTransfer.files).forEach(file => {
        const errors = validateFile(file);
        
        if (errors.length === 0) {
          validFiles.push(file);
        } else {
          rejected.push({
            file,
            errors
          });
        }
      });
      
      if (validFiles.length > 0) {
        onFilesDrop(validFiles);
      }
      
      if (rejected.length > 0) {
        setRejectedFiles(rejected);
        showToast({
          message: `${rejected.length} arquivo(s) rejeitado(s)`,
          type: "warning"
        });
      }
    }
  }, [onFilesDrop, maxSize, accept, showToast]);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesDrop(Array.from(e.target.files));
    }
  };

  return (
    <div 
      className={`relative ${className}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Overlay de Drag & Drop */}
      {dragActive && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex flex-col items-center justify-center z-10">
          <UploadCloud size={48} className="text-blue-500 mb-2" />
          <p className="text-blue-600 font-bold">Solte os arquivos aqui</p>
          <p className="text-blue-400 text-sm">Suporta imagens, PDFs e documentos</p>
        </div>
      )}
      
      {/* Input de arquivo oculto */}
      <input
        type="file"
        multiple
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        title="Clique ou arraste arquivos"
      />
      
      {/* Lista de arquivos rejeitados */}
      {rejectedFiles.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 max-w-xs shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-700 font-bold text-sm">Arquivos rejeitados:</p>
            <button 
              onClick={() => setRejectedFiles([])}
              className="p-1 hover:bg-red-100 rounded"
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {rejectedFiles.map(({ file, errors }, index) => (
              <div key={index} className="text-xs">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-red-600">{errors.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropZone;