const syncService = {
  notificarAtualizacao(data) {
    // Em produção, enviaria via WebSocket
    console.log('Notificar atualização:', data);
  }
};

export default syncService;