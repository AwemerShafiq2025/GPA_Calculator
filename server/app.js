import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { DB } from '../shared/universities.js';
import {
  calculateCGPA,
  calculateScenarios,
  calculateSGPA,
  calculateTargetSGPA,
  findMinimumGrade,
  normalizeScale,
  predictNextSemester
} from '../shared/calculations.js';
import { parseTranscriptFile } from './services/transcript.js';
import { createStorage } from './storage/index.js';

dotenv.config();

const app = express();
const maxMb = Number(process.env.UPLOAD_MAX_MB || 8);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024 }
});
const storage = createStorage();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));

function sendError(res, status, message, details) {
  return res.status(status).json({ error: message, details });
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/universities', (_req, res) => {
  res.json({ defaultUniversity: 'uol', universities: DB });
});

app.post('/api/calculate/sgpa', (req, res) => {
  try {
    res.json(calculateSGPA(req.body));
  } catch (error) {
    sendError(res, 400, error.message);
  }
});

app.post('/api/calculate/cgpa', (req, res) => {
  try {
    res.json(calculateCGPA(req.body));
  } catch (error) {
    sendError(res, 400, error.message);
  }
});

app.post('/api/calculate/predict', (req, res) => {
  try {
    res.json(predictNextSemester(req.body));
  } catch (error) {
    sendError(res, 400, error.message);
  }
});

app.post('/api/calculate/target', (req, res) => {
  try {
    res.json(calculateTargetSGPA(req.body));
  } catch (error) {
    sendError(res, 400, error.message);
  }
});

app.post('/api/calculate/grade-finder', (req, res) => {
  try {
    res.json(findMinimumGrade(req.body));
  } catch (error) {
    sendError(res, 400, error.message);
  }
});

app.post('/api/calculate/scenarios', (req, res) => {
  try {
    res.json(calculateScenarios(req.body));
  } catch (error) {
    sendError(res, 400, error.message);
  }
});

app.post(
  '/api/transcript/parse',
  upload.single('transcript'),
  asyncRoute(async (req, res) => {
    if (!req.file) return sendError(res, 400, 'Transcript file is required.');
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    const extAllowed = /\.(pdf|png|jpe?g)$/i.test(req.file.originalname || '');
    if (!allowed.includes(req.file.mimetype) && !extAllowed) {
      return sendError(res, 415, 'Only PDF, JPG, JPEG, and PNG transcripts are supported.');
    }
    const result = await parseTranscriptFile({
      file: req.file,
      university: req.body.university || 'uol',
      customGrades: req.body.customGrades ? JSON.parse(req.body.customGrades) : undefined
    });
    res.json(result);
  })
);

app.post(
  '/api/scales/custom',
  asyncRoute(async (req, res) => {
    const userId = String(req.body.userId || 'local');
    const grades = normalizeScale(req.body.grades || {});
    if (Object.keys(grades).length < 2) return sendError(res, 400, 'At least two grades are required.');
    await storage.saveCustomScale(userId, grades);
    res.json({ ok: true, userId, grades });
  })
);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return sendError(res, 400, error.message);
  }
  return sendError(res, 500, 'Unexpected server error.', error.message);
});

export default app;
