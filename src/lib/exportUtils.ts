import { Document, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { Agenda } from '../types';

export const exportText = (agenda: Agenda, selectedActionItems: string[]) => {
  const text = `${agenda.title}\n\n${agenda.objective}\n\n${agenda.items.map(i => `${i.title}\n${i.summary}\nDuration: ${i.durationMinutes}m\nKey Deliverables:\n${i.actionItems.filter(ai => selectedActionItems.includes(ai)).map(ai => `- ${ai}`).join('\n')}`).join('\n\n')}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${agenda.title.replace(/\s+/g, '_')}.txt`;
  a.click();
};

export const exportDocx = async (agenda: Agenda, selectedActionItems: string[]) => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: agenda.title, heading: 'Heading1' }),
        new Paragraph({ text: agenda.objective }),
        ...agenda.items.flatMap(item => [
          new Paragraph({ text: item.title, heading: 'Heading2' }),
          new Paragraph({ text: item.summary }),
          new Paragraph({ text: `Duration: ${item.durationMinutes} minutes` }),
          new Paragraph({ text: 'Key Deliverables:' }),
          ...item.actionItems.filter(ai => selectedActionItems.includes(ai)).map(ai => new Paragraph({ text: `• ${ai}` })),
          new Paragraph({ text: '' })
        ])
      ]
    }]
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${agenda.title.replace(/\s+/g, '_')}.docx`;
  a.click();
};

export const exportPdf = (agenda: Agenda, selectedActionItems: string[]) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(67, 56, 202);
  const titleLines = doc.splitTextToSize(agenda.title, 170);
  doc.text(titleLines, 20, 20);
  
  // Objective
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  const objLines = doc.splitTextToSize(agenda.objective, 170);
  let y = 20 + (titleLines.length * 8);
  doc.text(objLines, 20, y);
  
  // Agenda Heading
  y += (objLines.length * 6) + 10;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Agenda', 20, y);
  
  // Agenda List
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  y += 7;
  agenda.items.forEach((item, idx) => {
    doc.text(`${idx + 1}. ${item.title}`, 20, y);
    y += 6;
  });

  // Details Pages
  agenda.items.forEach(item => {
    doc.addPage();
    y = 20;
    
    doc.setFontSize(14);
    doc.setTextColor(67, 56, 202);
    doc.text(item.title, 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Duration: ${item.durationMinutes} minutes`, 20, y);
    y += 8;
    
    const summaryLines = doc.splitTextToSize(item.summary, 170);
    doc.text(summaryLines, 20, y);
    y += (summaryLines.length * 5) + 5;
    
    const filteredActionItems = item.actionItems.filter(ai => selectedActionItems.includes(ai));
    if (filteredActionItems.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Deliverables:', 20, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      filteredActionItems.forEach(ai => {
        doc.text(`• ${ai}`, 25, y);
        y += 6;
      });
    }
  });
  doc.save(`${agenda.title.replace(/\s+/g, '_')}.pdf`);
};

export const exportPptx = (agenda: Agenda, selectedActionItems: string[]) => {
  const pptx = new PptxGenJS();
  
  // Slide 1: Overview
  const slide1 = pptx.addSlide();
  slide1.addText(agenda.title, { x: 0.5, y: 0.5, fontSize: 28, bold: true, color: '4338ca' });
  slide1.addText(agenda.objective, { x: 0.5, y: 1.5, fontSize: 16 });
  
  const agendaList = agenda.items.map((i, idx) => `${idx + 1}. ${i.title}`).join('\n');
  slide1.addText('Agenda', { x: 0.5, y: 2.5, fontSize: 14, bold: true });
  slide1.addText(agendaList, { x: 0.5, y: 2.8, fontSize: 12 });
  
  // Subsequent Slides
  agenda.items.forEach((item) => {
    const s = pptx.addSlide();
    s.addText(item.title, { x: 0.5, y: 0.5, fontSize: 22, bold: true, color: '4338ca' });
    s.addText(item.summary, { x: 0.5, y: 1.2, fontSize: 13, w: '90%' });
    
    const filteredActionItems = item.actionItems.filter(ai => selectedActionItems.includes(ai));
    if (filteredActionItems.length > 0) {
      s.addText('Key Deliverables', { x: 0.5, y: 2.8, fontSize: 14, bold: true, color: 'e11d48' }); // Rose
      s.addText(filteredActionItems.map(ai => `• ${ai}`).join('\n'), { x: 0.5, y: 3.1, fontSize: 11 });
    }
  });
  pptx.writeFile({ fileName: `${agenda.title.replace(/\s+/g, '_')}.pptx` });
};
