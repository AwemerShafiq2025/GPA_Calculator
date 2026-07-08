# Pakistan GPA Calculator

A full-stack GPA/CGPA calculator for Pakistani universities with transcript parsing, university-specific grading scales, and planning tools (target GPA, grade finder, prediction, and scenarios).

## Features

- University-specific grading systems and point mapping
- SGPA and CGPA calculation endpoints
- GPA planning utilities:
  - target GPA calculator
  - required grade finder
  - prediction calculator
  - scenario comparison
- Transcript parsing pipeline:
  - PDF text extraction (`pdf-parse`)
  - Image OCR (`tesseract.js`)
  - Editable review before final GPA calculation
- Custom scale support with stateless-by-default persistence
- Production-oriented setup for Vercel deployment

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Shared domain logic:** `shared/` (used by both client and server)
- **Optional persistence:** PostgreSQL via `pg`
- **Testing:** Vitest + Supertest
- **Code quality:** ESLint + Prettier

## Project Structure

```text
.
├── api/          # Vercel serverless entry for API routing
├── client/       # React + Vite frontend
├── server/       # Express server (local/runtime API)
├── shared/       # University data + GPA formulas + shared utilities
├── tests/        # Unit/integration tests
├── .env.example
├── package.json
└── vercel.json
```

## Quick Start

### 1) Prerequisites

- Node.js (LTS recommended)
- npm

### 2) Install

```bash
npm install
```

### 3) Configure environment

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

### 4) Run in development

```bash
npm run dev
```

- Frontend (Vite): usually `http://localhost:5173`
- Backend (Express): `http://localhost:5000`
- In development, frontend requests to `/api` are proxied to Express.

## Available Scripts

```bash
npm run dev      # Run client + server concurrently
npm run dev:client
npm run dev:server
npm run build    # Build frontend for production
npm run start    # Run Express server
npm run test     # Run test suite
npm run lint     # Lint project
npm run format   # Format project
```

## Environment Variables

Create a `.env` file and configure values like:

```bash
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_MAX_MB=8
STORAGE_MODE=stateless
DATABASE_URL=
```

### Optional PostgreSQL mode

```bash
STORAGE_MODE=postgres
DATABASE_URL=your_postgres_connection_string
```

If PostgreSQL is not configured, the app runs in stateless mode.

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

## Transcript Parsing Notes

- Supported upload types: `.pdf`, `.jpg`, `.jpeg`, `.png`
- Text PDFs are parsed directly
- Images are processed with OCR
- Parsed output is reviewable/editable before GPA calculation
- Parser behavior is constrained by the active university scale to reduce invalid grade interpretation

## Deployment (Vercel)

1. Push code to GitHub.
2. Import `AwemerShafiq2025/GPA_Calculator` in Vercel.
3. Build command: `npm run build`
4. Install command: `npm install`
5. Configure environment variables from `.env.example`
6. Keep `STORAGE_MODE=stateless` unless PostgreSQL is configured.

`vercel.json` and `api/index.js` handle API routing for deployment.

## Data & Calculation Integrity

Core grading datasets and formula logic are centralized in the shared layer so client/server behavior stays consistent.

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## License

No license file is currently included in this repository.
If you want open-source usage terms, add a `LICENSE` file (e.g., MIT).
