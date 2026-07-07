# Pakistan GPA Calculator

A production-ready full-stack Node.js GPA/CGPA calculator for Pakistani university students. It includes university-specific grading scales, SGPA/CGPA calculators, planning tools, editable custom scales, and deterministic transcript upload parsing with no paid AI APIs.

## Architecture

- **Frontend:** React + Vite. This keeps the calculator fast, static-build friendly, and simple to deploy on Vercel.
- **Backend:** Express REST API served locally by `server/index.js` and on Vercel through `api/index.js`.
- **Shared logic:** `shared/` contains the exact university database and calculation formulas used by both client and server.
- **Persistence:** stateless by default. Custom scales are saved in browser `localStorage`; the server includes an optional Postgres storage adapter for Vercel Postgres or Supabase via `STORAGE_MODE=postgres`.
- **Transcript parsing:** PDFs are read with `pdf-parse`; images are OCR'd with Tesseract.js. The extracted text is parsed with deterministic regex rules and checked against the selected grading scale. No OpenAI, Gemini, Claude, or other paid model API is used.

## Design

The frontend uses a light-theme glassmorphism design system with translucent panels, soft shadows, and `backdrop-filter` blur/saturation for frosted surfaces. Results keep their performance color meaning through subtle glass tints instead of heavy solid gradients. Browsers without `backdrop-filter` fall back to solid off-white panels with normal borders and shadows.

Repository URL for your GitHub remote:

```bash
git remote add origin https://github.com/AwemerShafiq2025/GPA_Calculator.git
```

## Local Setup

1. Install Node.js latest LTS.
2. Install dependencies:

```bash
npm install
```

3. Copy environment defaults:

```bash
copy .env.example .env
```

4. Start the full app:

```bash
npm run dev
```

5. Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

The Express API runs on `http://localhost:5000`; Vite proxies `/api` requests to it during development.

## Scripts

```bash
npm run dev      # client + API
npm run build    # production frontend build
npm run start    # Express API only
npm run test     # Vitest unit and integration tests
npm run lint     # ESLint
npm run format   # Prettier
```

## Environment Variables

```bash
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_MAX_MB=8
STORAGE_MODE=stateless
DATABASE_URL=
```

For optional Postgres persistence, set:

```bash
STORAGE_MODE=postgres
DATABASE_URL=your_vercel_postgres_or_supabase_connection_string
```

The app works without a database.

## API Routes

- `GET /api/universities`
- `POST /api/calculate/sgpa`
- `POST /api/calculate/cgpa`
- `POST /api/calculate/predict`
- `POST /api/calculate/target`
- `POST /api/calculate/grade-finder`
- `POST /api/calculate/scenarios`
- `POST /api/transcript/parse`
- `POST /api/scales/custom`

## Transcript Upload Notes

Upload supports `.pdf`, `.jpg`, `.jpeg`, and `.png`. Text-based PDFs are parsed directly. Images are processed with Tesseract.js in Node. Every result is shown in an editable review table before it replaces the course builder.

Scanned PDFs without a text layer may need to be uploaded as page images for the OCR path, depending on the hosting environment. The parser never guesses grades outside the active university scale; those rows are flagged for manual correction.

## Deploy To Vercel

1. Push the project to GitHub:

```bash
git init
git add .
git commit -m "Initial Pakistan GPA Calculator"
git remote add origin https://github.com/AwemerShafiq2025/GPA_Calculator.git
git branch -M main
git push -u origin main
```

2. In Vercel, import `AwemerShafiq2025/GPA_Calculator`.
3. Use the default install command: `npm install`.
4. Use the build command: `npm run build`.
5. Vercel will serve `client/dist` and route `/api/*` to the Express app through `api/index.js`.
6. Add environment variables from `.env.example`. Leave `STORAGE_MODE=stateless` unless you connect Postgres.

## Data Integrity

The university list, grading points, and formulas are ported from the provided specification. University of Lahore (`uol`) is the default on load.
