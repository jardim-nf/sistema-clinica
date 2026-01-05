// src/utils/agendaUtils.js

export const getCorStatus = (status) => {
  switch (status) {
    case 'confirmado': return '#0d9488'; // Teal
    case 'em_atendimento': return '#2563eb'; // Blue
    case 'realizado': return '#64748b'; // Slate
    case 'faltou': return '#ef4444'; // Red
    case 'cancelado': return '#dc2626'; // Red (Adicionado)
    case 'atrasado': return '#f59e0b'; // Amber
    default: return '#10b981'; // Emerald (Agendado)
  }
};

export const getStatusBadge = (status) => {
  const config = {
    agendado: { label: 'Agendado', color: 'bg-emerald-50 text-emerald-700' },
    confirmado: { label: 'Confirmado', color: 'bg-teal-100 text-teal-800' },
    em_atendimento: { label: 'Em Atendimento', color: 'bg-blue-100 text-blue-800' },
    realizado: { label: 'Realizado', color: 'bg-slate-100 text-slate-800' },
    faltou: { label: 'Faltou', color: 'bg-red-100 text-red-800' },
    cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }, // Adicionado
    atrasado: { label: 'Atrasado', color: 'bg-amber-100 text-amber-800' }
  };
  return config[status] || config.agendado;
};