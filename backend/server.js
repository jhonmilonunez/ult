import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { exercisesRouter } from './routes/exercises.js';
import { sessionsRouter } from './routes/sessions.js';
import { setsRouter } from './routes/sets.js';
import { historyRouter } from './routes/history.js';
import { attendanceRouter } from './routes/attendance.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/sets', setsRouter);
app.use('/api/users/me/exercises', historyRouter);
app.use('/api/users/me/attendance', attendanceRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
