import api from './api';

export const configuracaoService = {
  async getConfiguracoes() {
    const response = await api.get('/configuracoes');
    return response.data;
  },

  async salvarConfiguracoes(configuracoes) {
    const response = await api.put('/configuracoes', configuracoes);
    return response.data;
  },

  async testarConfiguracaoEmail(configuracaoEmail) {
    const response = await api.post('/configuracoes/testar-email', configuracaoEmail);
    return response.data;
  }
};