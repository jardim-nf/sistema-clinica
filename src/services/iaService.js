export const iaService = {
  async obterSugestoes({ texto, tipo, especialidade, paciente }) {
    // Em produção, isso seria uma chamada API real
    return new Promise((resolve) => {
      setTimeout(() => {
        const sugestoes = [
          `Baseado nos sintomas descritos, considere incluir na evolução: "Paciente apresenta melhora progressiva, mantém tratamento conforme prescrito."`,
          `Para ${tipo === 'receita' ? 'receita' : 'documento'}, sugiro formato estruturado com data, identificação e assinatura.`,
          `Considere adicionar: "Realizar acompanhamento em 30 dias para reavaliação."`,
          `Para paciente com histórico similar, protocolo indica: "Manter acompanhamento mensal até estabilização completa."`
        ];
        resolve(sugestoes);
      }, 1500);
    });
  }
};

// Ou se quiser exportar apenas o objeto
export default iaService;