# Copilot Instructions for Attendence-Admin-Portal

## Architecture

**Vite-only frontend** with **Supabase backend** (no separate Node.js server).

- **Stack**: Vite + React + TypeScript + Tailwind, Supabase auth & database
- **Run**: `npm run dev` (single command, port 5173)
- **Build**: `npm run build`
- **Lint/Type**: `npm run lint`, `npm run typecheck`

## Environment Setup

Frontend `.env` (required):
```
VITE_SUPABASE_URL=https://yddzfmwjijevnjyukogy.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ltOpFmBLULMokez6L6Q_-A_y8OtlW0h
```

## Key Files & Patterns

- **Auth**: `src/contexts/AuthContext.tsx` — manages login, session, profile role
- **Admin helpers**: `src/lib/supabaseAdmin.ts` — `createUser()`, `deleteUser()`, `listUsers()` (Supabase direct calls)
- **Route guards**: `src/components/RedirectToRole.tsx` — blocks non-matching roles, redirects to portal
- **Portals**: `/admin`, `/hod`, `/faculty` under `src/pages/`, each with sidebar + route nesting
- **Roles**: Normalized to uppercase (`ADMIN`, `HOD`, `FACULTY`, `STUDENT`)

## Data Flow

1. User logs in → AuthContext fetches profile from `profiles` table
2. `RedirectToRole` checks role, redirects to `/admin`, `/hod`, or `/faculty`
3. Admin pages import helpers from `supabaseAdmin.ts` → direct Supabase calls
4. No backend API routes; all business logic runs client-side with Supabase client/SDK

## Adding Features

- **New user operations**: Add function to `src/lib/supabaseAdmin.ts`, call from component
- **New data fetch**: Use `supabase.from('table').select(...)` directly
- **New portal page**: Create `.tsx` in `src/pages/`, add route to portal's `<Routes>`
- **New sidebar link**: Edit sidebar component (e.g., `AdminSidebar.tsx`), update nav

## Project Structure

```
src/
├── components/
│   ├── admin/          # Admin portal components
│   ├── hod/            # HOD portal components
│   ├── faculty/        # Faculty portal components
│   ├── Auth/           # Login form
│   ├── common/         # Toast, shared components
│   └── Moderation/, Analytics/, Notifications/, Settings/
├── contexts/
│   └── AuthContext.tsx # Auth state management
├── lib/
│   ├── supabase.ts     # Supabase client initialization
│   └── supabaseAdmin.ts # Admin helper functions
├── pages/
│   ├── AdminPortal.tsx
│   ├── HodPortal.tsx
│   └── FacultyPortal.tsx
├── types/
│   ├── attendance.ts
│   └── types.ts
├── App.tsx             # Main routing + RedirectToRole
├── main.tsx
└── index.css
```

## Notes

- Supabase admin functions (user creation) run client-side for dev (should be server-side in production)
- Consider moving to Supabase edge functions or separate backend later if needed
