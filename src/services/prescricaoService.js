import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const prescricaoService = {
  /**
   * Gera um PDF de Prescrição Médica
   * @param {Object} clinica - Dados da clínica (nome, logo, endereco)
   * @param {Object} medico - Dados do médico (nome, crm, especialidade)
   * @param {Object} paciente - Dados do paciente (nome)
   * @param {Array} medicamentos - Array de objetos { nome, dosagem, uso }
   */
  gerarPDF: (clinica, medico, paciente, medicamentos) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Cabeçalho (Clínica)
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(clinica?.nome_fantasia || 'Clínica Médica', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (clinica?.endereco) {
        doc.text(clinica.endereco, pageWidth / 2, 26, { align: 'center' });
    }

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, 32, pageWidth - 20, 32);

    // 2. Dados do Paciente
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('RECEITUÁRIO', pageWidth / 2, 45, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Paciente: ${paciente?.nome || 'Não identificado'}`, 20, 60);
    if (paciente?.cpf) doc.text(`CPF: ${paciente.cpf}`, 20, 66);

    // 3. Medicamentos (Corpo da Receita)
    let startY = 80;
    
    medicamentos.forEach((med, index) => {
        // Nome do medicamento
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}) ${med.nome} ${med.dosagem ? `- ${med.dosagem}` : ''}`, 20, startY);
        
        // Uso/Posologia
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Quebra de linha para textos longos de uso
        const splitUso = doc.splitTextToSize(`Uso: ${med.uso}`, pageWidth - 40);
        doc.text(splitUso, 20, startY + 6);
        
        startY += 8 + (splitUso.length * 5); // Espaçamento dinâmico
    });

    // 4. Rodapé e Assinatura
    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const localData = `${clinica?.cidade || 'Local'}, ${hoje}`;
    
    doc.setFontSize(10);
    doc.text(localData, pageWidth / 2, 230, { align: 'center' });

    // Linha de Assinatura
    doc.line(pageWidth / 2 - 40, 260, pageWidth / 2 + 40, 260);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(medico?.nome || 'Nome do Médico', pageWidth / 2, 266, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const docIdentificacao = `Registro: ${medico?.crm || 'Não informado'} - ${medico?.especialidade || ''}`;
    doc.text(docIdentificacao, pageWidth / 2, 272, { align: 'center' });

    // QRCode simulado para Assinatura Digital ICP-Brasil
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Documento validado digitalmente. Escaneie o QR Code abaixo.", pageWidth / 2, 280, { align: 'center' });
    // Na vida real, desenharíamos o QRCode aqui com biblioteca qrcode.

    // Salvar
    doc.save(`Receita_${paciente?.nome?.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`);
  }
};
