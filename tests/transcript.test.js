import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../server/app.js';
import { parseTranscriptText } from '../server/services/transcript.js';
import { DB } from '../shared/universities.js';

function samplePdfBuffer() {
  return Buffer.from(`%PDF-1.3
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 142 >>
stream
BT /F1 12 Tf 50 750 Td
(Programming Fundamentals 3 A-) Tj
0 -16 Td
(Calculus I 3 B+) Tj
0 -16 Td
(English Composition 2 B) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000219 00000 n
0000000289 00000 n
trailer
<< /Root 1 0 R /Size 6 >>
startxref
481
%%EOF`);
}

describe('transcript parser', () => {
  it('parses course rows from transcript text', () => {
    const parsed = parseTranscriptText('CS-101 Programming Fundamentals 3 A-\nCalculus I 3 B+', DB.uol.grades);
    expect(parsed.courses).toEqual([
      { name: 'Programming Fundamentals', creditHours: 3, grade: 'A-' },
      { name: 'Calculus I', creditHours: 3, grade: 'B+' }
    ]);
  });

  it('parses uploaded sample PDF through the API route', async () => {
    const response = await request(app)
      .post('/api/transcript/parse')
      .field('university', 'uol')
      .attach('transcript', samplePdfBuffer(), { filename: 'sample.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(200);
    expect(response.body.courses.length).toBeGreaterThanOrEqual(3);
    expect(response.body.courses[0]).toMatchObject({ name: 'Programming Fundamentals', creditHours: 3, grade: 'A-' });
  });
});
