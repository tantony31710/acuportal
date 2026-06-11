# University Attendance — Local Development

Quick steps to run this project locally.

Prerequisites
- Recommended: Node.js (v18+). This repo includes a bundled Node/npm under `nodejs/` if you don't want a global install.

Environment
- Copy or create a `.env` file in the project root with the following variables (do NOT commit secrets):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_PROJECT_ID` depending on setup)
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only; keep secret)

Using the bundled Node/npm (Windows)

```powershell
# from repo root
$env:PATH = "$(Resolve-Path .\nodejs)\" + $env:PATH
cd universityattendance-main
npm install
npm run dev
```

Or if you have Node/npm installed globally:

```bash
cd universityattendance-main
npm install
npm run dev
```

Notes
- The dev server uses Vite and will pick a different port if the default is already used (it will log the actual URL).
- Type errors are checked with `tsc --noEmit` (requires `typescript` in `node_modules`).
- The `supabase/` folder at the repository root contains conceptual route-guard examples and is intentionally excluded from type checks. Actual Supabase client code lives under `src/supabase`.

Troubleshooting
- If `npm install` fails with "'node' is not recognized", include the bundled `nodejs` directory in `PATH` (see above) or install Node globally.
- If `npm install` reports file lock/EPERM errors, close editors/terminals that may be holding files, remove `node_modules`, then re-run `npm install`.

If you want, I can also:
- Add a short `CONTRIBUTING.md` or scripts for common tasks.
- Move conceptual files out of the repo root into a `docs/` folder.
- Create a small `make` / PowerShell helper to run common dev tasks.

