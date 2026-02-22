# Workout Tracker — API Route Design

RESTful API for the backend. All authenticated routes assume a mechanism (e.g. JWT in `Authorization` header or session cookie). Replace `:id` placeholders with actual UUIDs.

---

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user. |
| `POST` | `/api/auth/login` | Log in; returns token or sets session. |

**Payloads**

- **POST /api/auth/register**  
  Body: `{ "email": string, "password": string, "name"?: string }`

- **POST /api/auth/login**  
  Body: `{ "email": string, "password": string }`

---

## Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/me` | Current user profile (id, email, name). |

No body. Auth required.

---

## Exercises (exercise database — faceted search)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/exercises` | Search/filter exercises (facets + text). |
| `GET` | `/api/exercises/:id` | Single exercise by id. |

**Query params for GET /api/exercises**

- `q` (optional): search string (e.g. by name).
- `category` (optional): filter by category (e.g. `Chest`, `Back`).
- `equipment` (optional): filter by equipment (e.g. `Barbell`, `Dumbbell`).
- `limit` (optional): max results (default e.g. 20).
- `offset` (optional): pagination offset.

**Response (list):** array of `{ id, name, category, equipment, created_at }`.

---

## Sessions (workout sessions)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions` | Start a new session. |
| `GET` | `/api/sessions` | List current user’s sessions (optional date range). |
| `GET` | `/api/sessions/:id` | Single session with all sets and exercise details. |
| `PATCH` | `/api/sessions/:id` | Update session (e.g. set `ended_at`). |
| `DELETE` | `/api/sessions/:id` | Delete session (cascades to sets). |

**Payloads**

- **POST /api/sessions**  
  Body: `{ "started_at"?: string (ISO 8601) }` — optional; defaults to now.

- **PATCH /api/sessions/:id**  
  Body: `{ "ended_at"?: string \| null (ISO 8601) }` — e.g. to close the session.

**Query params for GET /api/sessions**

- `from`, `to` (optional): filter by `started_at` (ISO date or datetime).
- `limit`, `offset` (optional): pagination.

**Response (GET /api/sessions/:id):** session object with nested `sets` (each set including exercise `id`, `name`, `category`, `equipment`) and `exercise_sets` array with `id`, `exercise_id`, `set_number`, `weight_kg`, `reps`, `created_at`.

---

## Exercise sets (logging weight and reps)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions/:sessionId/sets` | Add a set to a session. |
| `PATCH` | `/api/sets/:id` | Update a set (e.g. weight/reps). |
| `DELETE` | `/api/sets/:id` | Delete a set. |

**Payloads**

- **POST /api/sessions/:sessionId/sets**  
  Body: `{ "exercise_id": string (UUID), "set_number": number, "weight_kg"?: number | null, "reps": number }`

- **PATCH /api/sets/:id**  
  Body: `{ "weight_kg"?: number | null, "reps"?: number }` — partial update.

All of these support retry-safe behavior: use idempotency keys or unique constraints (e.g. `session_id` + `exercise_id` + `set_number`) if you need to avoid duplicate sets on retry.

---

## In-context history (previous numbers for an exercise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/me/exercises/:exerciseId/history` | Last N sessions where the user did this exercise, with sets. |

**Query params**

- `limit` (optional): max number of past sessions to return (default e.g. 5 or 10).

**Response:** array of “session summary” objects, each containing session id, `started_at`, and an array of sets (`set_number`, `weight_kg`, `reps`, `created_at`) for that exercise in that session. Ordered by `started_at` descending so the UI can show “last time” first.

---

## Attendance calendar (days user worked out)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/me/attendance` | Dates (and optionally counts) the user had at least one session. |

**Query params**

- `from` (optional): start of range (ISO date).
- `to` (optional): end of range (ISO date).

**Response:** array of objects, e.g. `{ "date": "YYYY-MM-DD", "session_count"?: number }`, or simple list of date strings. Enough for a calendar view to mark workout days.

---

## Summary table

| Area | Method | Endpoint |
|------|--------|----------|
| Auth | POST | `/api/auth/register`, `/api/auth/login` |
| Users | GET | `/api/users/me` |
| Exercises | GET | `/api/exercises`, `/api/exercises/:id` |
| Sessions | POST, GET, PATCH, DELETE | `/api/sessions`, `/api/sessions/:id` |
| Sets | POST, PATCH, DELETE | `/api/sessions/:sessionId/sets`, `/api/sets/:id` |
| History | GET | `/api/users/me/exercises/:exerciseId/history` |
| Calendar | GET | `/api/users/me/attendance` |

---

## Error and robustness notes

- Use consistent HTTP status codes: `400` (validation), `401` (unauthorized), `403` (forbidden), `404` (not found), `409` (conflict), `500` (server error).
- Return JSON error bodies, e.g. `{ "error": "message", "code"?: "ERROR_CODE" }`.
- For retry-safe saves (sessions/sets), consider idempotency keys or unique constraints and return stable resource identifiers so the frontend can show loading/empty/error states and retry without creating duplicates.
