# QR Attendance Monorepo

A complete attendance system with a React admin portal, an Expo (React Native) mobile app, and Supabase backend (DB, Auth, Edge Functions).

**Projects**
- Admin portal (Vite + React + TS): [Attendence-Admin-Portal](Attendence-Admin-Portal)
- Mobile app (Expo + React Native): [Facer_app](Facer_app)
- Supabase (functions, migrations, config): [supabase](supabase)

---

## Key Features
- QR-based session attendance with expiry and class validation
- Student mobile app: login, scan QR, view analytics
- Admin/Faculty/HOD workflows: start sessions, submit, approve, export
- Row Level Security with role-aware access
- Supabase Edge Functions for secure, server-side logic

---

## Tech Stack
- Web: React 18, TypeScript, Vite, TailwindCSS, React Router, Recharts, XLSX
- Mobile: Expo SDK, React Native, Expo Router, NativeWind
- Backend: Supabase (PostgreSQL, Auth, Edge Functions)

---

## Repository Structure
```
Qr-Attendance-project/
├─ Attendence-Admin-Portal/       # Admin web app (Vite + React + TS)
├─ Facer_app/                     # Expo mobile app
└─ supabase/                      # Supabase functions, migrations, config
```

---

## Prerequisites
- Node.js 18+
- npm 9+
- Supabase account and project
- Expo Go app (for testing on device)

---

## Environment Variables

Create environment files for each app (do not commit them):

- Admin Portal (Vite): [Attendence-Admin-Portal/src/lib/supabase.ts](Attendence-Admin-Portal/src/lib/supabase.ts)
  - .env
    - `VITE_SUPABASE_URL=...`
    - `VITE_SUPABASE_ANON_KEY=...`

- Mobile App (Expo): typically at project root `.env`
  - .env
    - `EXPO_PUBLIC_SUPABASE_URL=...`
    - `EXPO_PUBLIC_SUPABASE_ANON_KEY=...`

- Edge Functions (Supabase dashboard → Project Settings → Functions → Secrets)
  - `SUPABASE_URL=...`
  - `SUPABASE_SERVICE_ROLE_KEY=...` (server-side only)

The repo ignores `.env*` files and `_archive/` via [/.gitignore](.gitignore).

---

## Admin Portal (Web)
Location: [Attendence-Admin-Portal](Attendence-Admin-Portal)

Scripts (from [Attendence-Admin-Portal/package.json](Attendence-Admin-Portal/package.json))
- `dev`: run Vite dev server
- `build`: production build to `dist/`
- `preview`: preview the production build
- `lint`, `typecheck`: quality checks

Setup
1) Install deps
```
cd Attendence-Admin-Portal
npm install
```
2) Create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3) Start dev
```
npm run dev
```
4) Build and preview
```
npm run build
npm run preview
```

Deployment (Vercel)
- Root config: [vercel.json](vercel.json)
- SPA rewrites: [Attendence-Admin-Portal/vercel.json](Attendence-Admin-Portal/vercel.json)

---

## Mobile App (Expo)
Location: [Facer_app](Facer_app)

Scripts (from [Facer_app/package.json](Facer_app/package.json))
- `dev`: start Expo bundler (Metro)
- `build:web`: export web build
- `lint`, `typecheck`

Setup
1) Install deps
```
cd Facer_app
npm install
```
2) Create `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3) Start dev (correct command)
```
npm run dev
# or
npx expo start
```
Open the Expo QR in Expo Go (Android/iOS) to preview.

---

## Supabase Backend
Location: [supabase](supabase)

### Edge Functions
Functions live under [supabase/functions](supabase/functions). Examples:
- Attendance scan: [supabase/functions/attendance-scan/index.ts](supabase/functions/attendance-scan/index.ts)
- Start session: [supabase/functions/start-session/index.ts](supabase/functions/start-session/index.ts)
- Mark attendance: [supabase/functions/mark-attendance/index.ts](supabase/functions/mark-attendance/index.ts)
- HOD approval: [supabase/functions/hod-approval/index.ts](supabase/functions/hod-approval/index.ts)
- Submit approval: [supabase/functions/submit-approval/index.ts](supabase/functions/submit-approval/index.ts)
- Face verify: [supabase/functions/face-verify/index.ts](supabase/functions/face-verify/index.ts)
- Create user: [supabase/functions/create-user/index.ts](supabase/functions/create-user/index.ts)
- Clear attendance: [supabase/functions/clear-attendance/index.ts](supabase/functions/clear-attendance/index.ts)
- Student signup: [supabase/functions/student-signup/index.ts](supabase/functions/student-signup/index.ts)

Local Config: [supabase/config.toml](supabase/config.toml)

Deploy functions via Supabase CLI or dashboard. CLI example:
```
# From the repo root
supabase functions deploy attendance-scan
supabase functions deploy start-session
supabase functions deploy mark-attendance
supabase functions deploy hod-approval
supabase functions deploy submit-approval
supabase functions deploy face-verify
supabase functions deploy create-user
supabase functions deploy clear-attendance
supabase functions deploy student-signup
```
Set function secrets (in Supabase dashboard → Functions → Secrets):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Database & Migrations
Migrations are in [supabase/migrations](supabase/migrations). Apply via your preferred workflow:
- Supabase CLI (local dev): `supabase db reset` (local)
- Supabase Studio SQL editor (prod) or CI-based migrations

RLS/Policies are expected for core tables (e.g., `profiles`, `students`, `sessions`, `attendance_marks`, `approvals`).

---

## Typical Workflow
1) Faculty starts session (admin web) → QR generated
2) Student scans QR (mobile) → Edge function validates + records `attendance_marks`
3) Faculty submits session → HOD reviews/approves
4) Admin exports approved attendance to Excel

---

## Troubleshooting
- Dev server fails (`npm run dev`): ensure Node 18+, run `npm install`, check `.env` exists
- Expo command typo (`npx expo stra`): use `npm run dev` or `npx expo start`
- 401/403 from functions: ensure Authorization header present; user role matches; secrets configured
- QR rejected: ensure session `status = ACTIVE`, `expires_at` not passed, and student belongs to session class
- Missing names/roster mismatch: verify `students` linked to `profiles` and `auth.users`

Useful sources:
- Web Supabase client: [Attendence-Admin-Portal/src/lib/supabase.ts](Attendence-Admin-Portal/src/lib/supabase.ts)
- Attendance scan function: [supabase/functions/attendance-scan/index.ts](supabase/functions/attendance-scan/index.ts)

---

## Scripts Quick Reference
Web:
```
cd Attendence-Admin-Portal
npm run dev
npm run build && npm run preview
```
Mobile:
```
cd Facer_app
npm run dev
```
Functions:
```
# Example
supabase functions deploy attendance-scan
```

---

## Notes
- Keep secrets out of source control; use `.env` and function secrets
- Do not delete migration history under [supabase/migrations](supabase/migrations)
- SPA routing handled by [Attendence-Admin-Portal/vercel.json](Attendence-Admin-Portal/vercel.json)
