const formatarCPF = (cpf) => {
  if (!cpf) return '---';
  const limpo = cpf.replace(/\D/g, "");
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

export const defaultTemplates = {
  evolucao: (paciente, data, nomeClinica = "CLÍNICA MÉDICA") => `
    <p><strong>${nomeClinica.toUpperCase()}</strong></p>
    <p>Atendimento Clínico Especializado</p>
    <br>
    <p><strong>PACIENTE:</strong> ${paciente?.nome || 'Não identificado'}</p>
    <p><strong>DATA:</strong> ${data || new Date().toLocaleDateString()}</p>
    <p><strong>CPF:</strong> ${formatarCPF(paciente?.cpf)}</p>
    <p>------------------------------------------------------------</p>
    <br>
    <p><strong>QUEIXA PRINCIPAL:</strong></p>
    <p>Digite aqui o relato do paciente...</p>
    <br>
    <p><strong>EXAME FÍSICO / AVALIAÇÃO:</strong></p>
    <p>Sinais Vitais:</p>
    <p>• PA: </p>
    <p>• FC: </p>
    <p>• Temp: </p>
    <br>
    <p><strong>Avaliação Geral:</strong></p>
    <p>Escreva os achados clínicos aqui...</p>
    <br>
    <p><strong>CONDUTA E ORIENTAÇÕES:</strong></p>
    <p>1. </p>
    <br>
    <p>------------------------------------------------------------</p>
    <p><strong>Assinatura e Carimbo do Profissional</strong></p>
  `,

  receita: (paciente, data, nomeClinica = "CLÍNICA MÉDICA") => `
    <p style="text-align: center;"><strong>${nomeClinica.toUpperCase()}</strong></p>
    <p style="text-align: center;"><strong>RECEITUÁRIO MÉDICO</strong></p>
    <br>
    <p><strong>PACIENTE:</strong> ${paciente?.nome}</p>
    <p><strong>DATA:</strong> ${data}</p>
    <p><strong>CPF:</strong> ${formatarCPF(paciente?.cpf)}</p>
    <p>------------------------------------------------------------</p>
    <br>
    <p><strong>USO INTERNO / ORAL:</strong></p>
    <br>
    <p><strong>1. </strong></p>
    <p>Tomar 01 comprimido via oral de ____ em ____ horas por ____ dias.</p>
    <br>
    <p><strong>2. </strong></p>
    <p>Tomar 01 comprimido via oral de ____ em ____ horas em caso de dor.</p>
    <br>
    <p>------------------------------------------------------------</p>
    <p style="text-align: center;"><strong>Assinatura e Carimbo do Profissional</strong></p>
  `,

  atestado: (paciente, data, nomeClinica = "CLÍNICA MÉDICA") => `
    <p style="text-align: center;"><strong>${nomeClinica.toUpperCase()}</strong></p>
    <p style="text-align: center;"><strong>ATESTADO MÉDICO</strong></p>
    <br>
    <p>Atesto que o(a) Sr(a) <strong>${paciente?.nome}</strong>, inscrito(a) no CPF <strong>${formatarCPF(paciente?.cpf)}</strong>, foi atendido(a) nesta data e necessita de ____ dias de repouso para recuperação de sua saúde.</p>
    <br>
    <p style="text-align: center;">${data}</p>
    <br>
    <p style="text-align: center;">------------------------------------------------------------</p>
    <p style="text-align: center;"><strong>Assinatura e Carimbo do Profissional</strong></p>
  `,

  declaracao: (paciente, data, nomeClinica = "CLÍNICA MÉDICA") => `
    <p style="text-align: center;"><strong>${nomeClinica.toUpperCase()}</strong></p>
    <p style="text-align: center;"><strong>DECLARAÇÃO DE COMPARECIMENTO</strong></p>
    <br/>
    <p>Declaro que o(a) Sr(a) <strong>${paciente?.nome}</strong>, portador(a) do CPF nº <strong>${formatarCPF(paciente?.cpf)}</strong>, compareceu a esta clínica na data de hoje para fins de consulta médica.</p>
    <br/>
    <p style="text-align: center;">${data}</p>
    <br/>
    <p style="text-align: center;">------------------------------------------------------------</p>
    <p style="text-align: center;"><strong>Assinatura e Carimbo do Profissional</strong></p>
  `
};

export const templates = [
  { id: 't1', nome: 'Evolução Clínica', tipo: 'evolucao' },
  { id: 't2', nome: 'Receituário', tipo: 'receita' },
  { id: 't3', nome: 'Atestado Médico', tipo: 'atestado' },
  { id: 't4', nome: 'Declaração', tipo: 'declaracao' },
];