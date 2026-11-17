import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const RESUMES_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/resumes');

/**
 * Generates a valid, standards-compliant PDF 1.4 document buffer with clean text lines
 * so demo student resumes open cleanly in any browser PDF viewer.
 */
export const createResumePdfBuffer = ({ name, studentId, branch, graduationYear, cgpa, email, phone, skills = [], bio = '' }) => {
  const escapePdfText = (str) =>
    String(str || '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ' ');

  const lines = [
    { text: name.toUpperCase(), size: 20, y: 740, bold: true },
    { text: `USN: ${studentId}  |  Branch: ${branch}  |  Class of ${graduationYear}`, size: 11, y: 716 },
    { text: `Email: ${email}  |  Phone: ${phone || 'N/A'}`, size: 11, y: 698 },
    { text: '__________________________________________________________________________', size: 10, y: 682 },
    { text: 'ACADEMIC SUMMARY', size: 13, y: 655, bold: true },
    { text: `Current Cumulative GPA (CGPA): ${cgpa} / 10.0`, size: 11, y: 635 },
    { text: `Degree: B.E. / B.Tech in ${branch} (Graduating ${graduationYear})`, size: 11, y: 618 },
    { text: 'PROFILE & OBJECTIVE', size: 13, y: 584, bold: true },
    { text: bio.slice(0, 88), size: 11, y: 564 },
    ...(bio.length > 88 ? [{ text: bio.slice(88, 176), size: 11, y: 548 }] : []),
    { text: 'TECHNICAL SKILLS', size: 13, y: 514, bold: true },
    { text: skills.join('  •  '), size: 11, y: 494 },
    { text: 'VERIFICATION', size: 13, y: 454, bold: true },
    { text: 'Verified Campus Placement Resume — Generated via HireTrack Placement Portal', size: 10, y: 434 }
  ];

  const streamCommands = lines
    .map((line) => {
      const font = line.bold ? '/F2' : '/F1';
      return `BT ${font} ${line.size} Tf 50 ${line.y} Td (${escapePdfText(line.text)}) Tj ET`;
    })
    .join('\n');

  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n'
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamCommands, 'utf8')} >>\nstream\n${streamCommands}\nendstream\nendobj\n`
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
};

export const ensureDemoResumeFile = (fileName, studentInfo) => {
  if (!fs.existsSync(RESUMES_UPLOAD_DIR)) {
    fs.mkdirSync(RESUMES_UPLOAD_DIR, { recursive: true });
  }
  const filePath = path.join(RESUMES_UPLOAD_DIR, path.basename(fileName));
  const buffer = createResumePdfBuffer(studentInfo);
  fs.writeFileSync(filePath, buffer);
  return {
    filePath,
    size: buffer.length
  };
};
