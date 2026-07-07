import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { resolveGrades } from '../../shared/calculations.js';

const COURSE_CODE = /^[A-Z]{2,5}\s*[-]?\s*\d{3,4}\s+/i;
const TRAILING_ROW =
  /^(?<name>.+?)\s+(?<ch>[0-9](?:\.[0-9])?)\s+(?<grade>A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F)\s*$/i;
const CODE_ROW =
  /^(?<code>[A-Z]{2,5}\s*[-]?\s*\d{3,4})\s+(?<name>.+?)\s+(?<ch>[0-9](?:\.[0-9])?)\s+(?<grade>A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F)\s*$/i;

export async function parseTranscriptFile({ file, university, customGrades }) {
  const text = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '')
    ? await extractPdfText(file.buffer)
    : await extractImageText(file.buffer);
  const grades = resolveGrades(university, customGrades);
  const parsed = parseTranscriptText(text, grades);
  return {
    courses: parsed.courses,
    warnings: parsed.warnings,
    rawTextPreview: text.replace(/\s+/g, ' ').trim().slice(0, 800)
  };
}

export async function extractPdfText(buffer) {
  try {
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim().length > 20) return data.text;
  } catch (_error) {
    // Fall through to a literal-string recovery path for simple PDFs and tests.
  }
  const loose = buffer
    .toString('latin1')
    .match(/\(([^()]{2,})\)/g)
    ?.map((item) => item.slice(1, -1))
    .join('\n');
  if (loose?.trim()) return loose;
  return '';
}

export async function extractImageText(buffer) {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

export function parseTranscriptText(text, scaleGrades) {
  const warnings = [];
  const normalizedGrades = Object.fromEntries(Object.keys(scaleGrades).map((grade) => [grade.toUpperCase(), grade]));
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const courses = [];

  for (const line of lines) {
    const cleaned = line.replace(/\b(Credit Hours?|Cr\.?Hrs?|Grade|QP|Quality Points?)\b/gi, '').trim();
    const match = cleaned.match(CODE_ROW) || cleaned.match(TRAILING_ROW);
    if (!match?.groups) continue;

    const gradeToken = match.groups.grade.toUpperCase();
    const grade = normalizedGrades[gradeToken];
    const name = (match.groups.name || '').replace(COURSE_CODE, '').trim();
    const creditHours = Number(match.groups.ch);
    if (!grade) {
      warnings.push(`Skipped "${line}" because grade ${gradeToken} is not in the selected grading scale.`);
      continue;
    }
    if (!Number.isFinite(creditHours) || creditHours <= 0 || creditHours > 6) {
      warnings.push(`Skipped "${line}" because credit hours could not be trusted.`);
      continue;
    }
    if (name.length < 3 || /semester|cgpa|sgpa|total|earned|attempted/i.test(name)) continue;
    courses.push({ name, creditHours, grade });
  }

  const deduped = [];
  const seen = new Set();
  for (const course of courses) {
    const key = `${course.name.toLowerCase()}|${course.creditHours}|${course.grade}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(course);
    }
  }
  if (deduped.length === 0) {
    warnings.push('No reliable course rows were detected. Try a clearer image or enter courses manually.');
  }
  return { courses: deduped, warnings };
}
