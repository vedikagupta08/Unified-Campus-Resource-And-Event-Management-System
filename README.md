# Unified Campus Resource & Event Management System

This monorepo contains backend (Express + Prisma + MySQL + JWT + RBAC) and frontend (React + Tailwind + Vite) for a production-oriented campus governance platform.

## Structure
- backend/ — API server with Prisma ORM, JWT auth, RBAC, routes for auth, events, resources, bookings, analytics
- frontend/ — React app with Tailwind, role-aware UI, basic pages and API client

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+ (or a managed MySQL like PlanetScale/Railway)

### Backend Setup
1. Copy backend/.env.example to backend/.env and fill values.
2. Install deps: `npm install` (from backend directory).
3. Run Prisma migrate: `npx prisma migrate dev`.
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
