# Unified Campus Resource & Event Management System

This monorepo contains backend (Express + Prisma + MySQL + JWT + RBAC) and frontend (React + Tailwind + Vite) for a production-oriented campus governance platform.

## Structure
- backend/ — API server with Prisma ORM, JWT auth, RBAC, routes for auth, events, resources, bookings, analytics
- frontend/ — React app with Tailwind, role-aware UI, basic pages and API client

## Quick Start

### Run both (from project root)
To start **backend + frontend** in one go (avoids `net::ERR_CONNECTION_REFUSED`):
```bash
npm install
npm run dev
```
This runs the API on http://localhost:4000 and the app on the Vite dev server. Ensure `backend/.env` and `frontend/.env` are set up first (see below).

### Prerequisites
- Node.js 18+
- MySQL 8+ (or a managed MySQL like PlanetScale/Railway)

### Backend Setup
1. Copy backend/.env.example to backend/.env and fill values (including `DATABASE_URL` for MySQL).
2. Install deps: `npm install` (from backend directory).
3. **Run Prisma migrations** (required for notifications, clubs, resources, events):  
   `cd backend && npx prisma migrate dev`  
   Then: `npx prisma generate`.
4. Seed (optional): `npm run seed`.
5. Start dev server: `npm run dev`.

### Frontend Setup
1. Copy frontend/.env.example to frontend/.env and set `VITE_API_BASE_URL` to your backend URL (e.g., http://localhost:4000).
2. Install deps: `npm install` (from frontend directory).
3. Start dev server: `npm run dev`.

### Deployment
- Frontend: Vercel (build: `npm run build`, output: `dist`)
- Backend: Render / Railway (set env vars and a managed MySQL instance; run `npm run start`)

### Notes
- Backend enforces permissions (RBAC) and state transitions.
- Frontend adapts UI based on role from JWT payload.
- Prisma schema supports multi-club membership and resource bookings.

### Troubleshooting

**"net::ERR_CONNECTION_REFUSED" or API calls failing**
- The backend must be running for the frontend to work. Start it first:
  - Open a terminal, go to `backend`, run `npm run dev`.
  - Backend listens on **http://localhost:4000** by default.
- Ensure `frontend/.env` has `VITE_API_BASE_URL=http://localhost:4000` (no trailing slash).

**Notifications or Clubs section not working / "Database schema outdated"**
- Run Prisma migrations so the database has all required tables and columns (Notification category/readAt, RoleRequest, etc.):
  - `cd backend`
  - `npx prisma migrate dev`
  - `npx prisma generate`
- Restart the backend (`npm run dev`).

**404 favicon**
- A favicon is now included in `frontend/index.html` (inline). If you still see 404, hard-refresh the page.
