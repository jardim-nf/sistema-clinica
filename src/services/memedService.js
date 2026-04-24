/**
 * MEMED API (Mock/Architecture)
 * Para usar a API real:
 * 1. O médico e a clínica precisam se cadastrar no portal de parceiros da Memed.
 * 2. Receber o `API_KEY` e o `SECRET_KEY`.
 * 3. Incorporar o script web da Memed no index.html (<script type="text/javascript" src="https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js"></script>)
 */

export const memedService = {
  // Inicializa o token do médico na Memed
  gerarTokenMedico: async (medicoCrm, medicoUf, clinicaApiToken) => {
    /* 
    Exemplo de chamada Backend (Node.js) para gerar Token do médico:
    const response = await axios.post('https://api.memed.com.br/v1/sinapse-prescricao/usuarios', {
      data: {
        attributes: {
          external_id: medicoId,
          nome: medicoNome,
          crm: medicoCrm,
          uf: medicoUf
        }
      }
    }, { headers: { 'Authorization': `Bearer ${clinicaApiToken}` } });
    return response.data.data.attributes.token;
    */
    console.log(`[Memed] Token gerado para CRM ${medicoCrm}-${medicoUf}`);
    return "token_mock_memed_12345";
  },

  // Abre o widget da Memed na tela (O script injeta um iframe modal)
  abrirWidgetMemed: (medicoToken, pacienteDados) => {
    console.log("[Memed] Abrindo widget com token:", medicoToken);
    
    // Na vida real, chamaríamos:
    // window.Memed({
    //   token: medicoToken,
    //   paciente: {
    //     nome: pacienteDados.nome,
    //     cpf: pacienteDados.cpf,
    //     telefone: pacienteDados.telefone
    //   },
    //   features: {
    //     receituario: true,
    //     atestado: true,
    //     exames: true
    //   }
    // }).init();
    
    alert("Nesta fase, a Memed seria aberta aqui. Como você precisa de chaves de produção da Memed, estamos usando o gerador PDF interno.");
  }
};
