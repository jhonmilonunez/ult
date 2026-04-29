# ULT Backend

Node + Express API and PostgreSQL for the workout tracker. Implements the API in `docs/api-routes.md` with retry-safe set creation.

## Setup

1. **PostgreSQL** — Create a database (e.g. `createdb ult`).
2. **Environment** — Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — e.g. `postgres://localhost:5432/ult`
   - `JWT_SECRET` — at least 32 characters
   - `PORT` — default `3000`
3. **Install, migrate, seed**
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```
4. **Start** — `npm run dev` (API at http://localhost:3000).

Frontend defaults to `VITE_API_URL=http://localhost:3000`. After seeding, log in with **demo@example.com** / **demo1234** or register a new account.
