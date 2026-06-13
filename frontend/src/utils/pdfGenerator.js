import { jsPDF } from 'jspdf';

export function generatePDF({ candidate, scores, feedback, resumeMatch }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const colors = {
    primary: '#6c63ff',
    secondary: '#00d4aa',
    dark: '#0a0a1a',
    text: '#333333',
    muted: '#888888',
  };

  let y = 20;

  doc.setFillColor(10, 10, 26);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('CAMS Interview Report', pageWidth / 2, 28, { align: 'center' });

  y = 55;
  doc.setTextColor(colors.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const leftX = 20;
  const rightX = pageWidth / 2 + 10;
  const labelColor = colors.muted;

  doc.setTextColor(labelColor);
  doc.setFontSize(10);
  doc.text('Candidate', leftX, y);
  doc.setTextColor(colors.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(candidate.name || 'N/A', leftX, y + 6);
  doc.setFont('helvetica', 'normal');

  doc.setTextColor(labelColor);
  doc.setFontSize(10);
  doc.text('Role', rightX, y);
  doc.setTextColor(colors.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(candidate.role || 'N/A', rightX, y + 6);
  doc.setFont('helvetica', 'normal');

  y += 25;
  doc.setTextColor(labelColor);
  doc.setFontSize(10);
  doc.text('Email', leftX, y);
  doc.setTextColor(colors.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(candidate.email || 'N/A', leftX, y + 6);

  doc.setTextColor(labelColor);
  doc.setFontSize(10);
  doc.text('Date', rightX, y);
  doc.setTextColor(colors.text);
  doc.setFontSize(12);
  doc.text(new Date().toLocaleDateString(), rightX, y + 6);

  y += 30;
  doc.setDrawColor(108, 99, 255);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  doc.setTextColor(colors.primary);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Score Summary', leftX, y);
  y += 12;

  const scoreKeys = [
    { label: 'Overall Score', key: 'overall', color: '#6c63ff' },
    { label: 'Technical', key: 'technical', color: '#6c63ff' },
    { label: 'Communication', key: 'communication', color: '#00d4aa' },
    { label: 'Confidence', key: 'confidence', color: '#ffd93d' },
    { label: 'Behavior', key: 'behavior', color: '#ff6b9d' },
    { label: 'Resume Match', key: 'resumeMatch', color: '#ff8a5c' },
    { label: 'Semantic', key: 'semantic', color: '#a78bfa' },
    { label: 'Emotion', key: 'emotion', color: '#f472b6' },
  ];

  const colW = (pageWidth - 40) / 4;
  scoreKeys.forEach((s, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 20 + col * colW;
    const yy = y + row * 20;

    doc.setFillColor(245, 245, 255);
    doc.roundedRect(x, yy, colW - 4, 16, 2, 2, 'F');
    doc.setTextColor(colors.muted);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(s.label, x + 4, yy + 5);
    doc.setTextColor(colors.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${scores[s.key] || 0}%`, x + colW - 20, yy + 5);
  });

  y += 50;

  if (feedback) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(108, 99, 255);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setTextColor(colors.primary);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Feedback', leftX, y);
    y += 12;

    if (feedback.strengths && feedback.strengths.length > 0) {
      doc.setTextColor(colors.secondary);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Strengths', leftX, y);
      y += 7;
      doc.setTextColor(colors.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      feedback.strengths.forEach((s) => {
        doc.text(`- ${s}`, leftX + 5, y);
        y += 6;
      });
      y += 4;
    }

    if (y > 250) { doc.addPage(); y = 20; }

    if (feedback.weaknesses && feedback.weaknesses.length > 0) {
      doc.setTextColor('#ff6b9d');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Areas for Improvement', leftX, y);
      y += 7;
      doc.setTextColor(colors.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      feedback.weaknesses.forEach((w) => {
        doc.text(`- ${w}`, leftX + 5, y);
        y += 6;
      });
      y += 4;
    }

    if (y > 250) { doc.addPage(); y = 20; }

    if (feedback.recommendedSkills && feedback.recommendedSkills.length > 0) {
      doc.setTextColor('#ffd93d');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Recommended Skills', leftX, y);
      y += 7;
      doc.setTextColor(colors.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(feedback.recommendedSkills.join(', '), leftX + 5, y);
      y += 8;
    }

    if (y > 250) { doc.addPage(); y = 20; }

    if (feedback.improvementAreas) {
      doc.setTextColor('#ff8a5c');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Improvement Plan', leftX, y);
      y += 7;
      doc.setTextColor(colors.text);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      feedback.improvementAreas.forEach((area) => {
        doc.text(`- ${area}`, leftX + 5, y);
        y += 6;
      });
      y += 4;
    }

    if (y > 250) { doc.addPage(); y = 20; }

    if (feedback.summary) {
      doc.setTextColor(colors.text);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Interview Summary', leftX, y);
      y += 7;
      doc.setTextColor(colors.muted);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(feedback.summary, pageWidth - 50);
      doc.text(summaryLines, leftX + 5, y);
      y += summaryLines.length * 5 + 10;
    }

    if (feedback.recommendation) {
      if (y > 250) { doc.addPage(); y = 20; }
      const isPositive = feedback.recommendation === 'Strong Hire' || feedback.recommendation === 'Hire';
      doc.setFillColor(isPositive ? 0 : 255, isPositive ? 212 : 107, isPositive ? 170 : 157);
      doc.roundedRect(20, y, pageWidth - 40, 14, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Hiring Recommendation: ${feedback.recommendation}`, pageWidth / 2, y + 10, { align: 'center' });
    }
  }

  y += 30;
  doc.setFontSize(8);
  doc.setTextColor(colors.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated by CAMS - Cognitive Adaptive Multi-Modal Interview System`, pageWidth / 2, 285, { align: 'center' });
  doc.text(`Report Date: ${new Date().toISOString()}`, pageWidth / 2, 291, { align: 'center' });

  doc.save(`CAMS_Report_${candidate.name?.replace(/\s+/g, '_') || 'Candidate'}.pdf`);
}
