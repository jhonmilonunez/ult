import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

export const sessionsRouter = express.Router();
sessionsRouter.use(requireAuth);

function parseIso(s) {
  if (s == null || s === '') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

sessionsRouter.post('/', async (req, res, next) => {
  try {
    const startedAt = parseIso(req.body?.started_at) ?? new Date().toISOString();
    const {
      rows: [row],
    } = await query(
      `INSERT INTO sessions (user_id, started_at) VALUES ($1, $2)
       RETURNING id, user_id, started_at, ended_at, created_at`,
      [req.user.id, startedAt]
    );
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

sessionsRouter.get('/', async (req, res, next) => {
  try {
    const { from, to, limit = 50, offset = 0 } = req.query;
    const params = [req.user.id];
    const conditions = ['user_id = $1'];
    let n = 2;
    if (from) {
      conditions.push(`started_at >= $${n}`);
      params.push(parseIso(from) ?? from);
      n++;
    }
    if (to) {
      conditions.push(`started_at <= $${n}`);
      params.push(parseIso(to) ?? to);
      n++;
    }
    params.push(Math.min(Number(limit) || 50, 100), Number(offset) || 0);
    const { rows } = await query(
      `SELECT id, user_id, started_at, ended_at, created_at
       FROM sessions
       WHERE ${conditions.join(' AND ')}
       ORDER BY started_at DESC
       LIMIT $${n} OFFSET $${n + 1}`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

sessionsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      rows: [session],
    } = await query(
      `SELECT id, user_id, started_at, ended_at, created_at
       FROM sessions WHERE id = $1`,
      [id]
    );
    if (!session) {
      return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
    }
    if (session.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { rows: sets } = await query(
      `SELECT es.id, es.exercise_id, es.set_number, es.weight_kg, es.reps, es.created_at,
              e.name AS exercise_name, e.category AS exercise_category, e.equipment AS exercise_equipment
       FROM exercise_sets es
       JOIN exercises e ON e.id = es.exercise_id
       WHERE es.session_id = $1
       ORDER BY es.created_at`,
      [id]
    );
    const exercise_sets = sets.map((s) => ({
      id: s.id,
      exercise_id: s.exercise_id,
      set_number: s.set_number,
      weight_kg: s.weight_kg != null ? Number(s.weight_kg) : null,
      reps: s.reps,
      created_at: s.created_at,
      exercise: {
        id: s.exercise_id,
        name: s.exercise_name,
        category: s.exercise_category,
        equipment: s.exercise_equipment,
      },
    }));
    res.json({
      ...session,
      sets: exercise_sets,
      exercise_sets,
    });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const endedAt = req.body?.ended_at !== undefined ? parseIso(req.body.ended_at) : undefined;
    const {
      rows: [existing],
    } = await query(`SELECT id, user_id FROM sessions WHERE id = $1`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
    }
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    if (endedAt === undefined) {
      return res.json(existing);
    }
    const {
      rows: [updated],
    } = await query(
      `UPDATE sessions SET ended_at = $2 WHERE id = $1
       RETURNING id, user_id, started_at, ended_at, created_at`,
      [id, endedAt]
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

sessionsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      rows: [existing],
    } = await query(`SELECT id, user_id FROM sessions WHERE id = $1`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
    }
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    await query(`DELETE FROM sessions WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

sessionsRouter.post('/:sessionId/sets', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const {
      rows: [session],
    } = await query(`SELECT id, user_id FROM sessions WHERE id = $1`, [sessionId]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
    }
    if (session.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    const { exercise_id, set_number, weight_kg, reps } = req.body ?? {};
    if (!exercise_id || set_number == null || reps == null) {
      return res.status(400).json({
        error: 'exercise_id, set_number, and reps required',
        code: 'VALIDATION',
      });
    }
    const repsNum = Number(reps);
    if (!Number.isInteger(repsNum) || repsNum < 1) {
      return res.status(400).json({ error: 'reps must be a positive integer', code: 'VALIDATION' });
    }
    const weightVal = weight_kg != null && weight_kg !== '' ? Number(weight_kg) : null;
    if (weightVal != null && (Number.isNaN(weightVal) || weightVal < 0)) {
      return res.status(400).json({ error: 'weight_kg must be non-negative or null', code: 'VALIDATION' });
    }
    try {
      const {
        rows: [row],
      } = await query(
        `INSERT INTO exercise_sets (session_id, exercise_id, set_number, weight_kg, reps)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (session_id, exercise_id, set_number) DO UPDATE SET
           weight_kg = EXCLUDED.weight_kg,
           reps = EXCLUDED.reps
         RETURNING id, session_id, exercise_id, set_number, weight_kg, reps, created_at`,
        [sessionId, exercise_id, Number(set_number), weightVal, repsNum]
      );
      return res.status(201).json(row);
    } catch (e) {
      if (e.code === '23503') {
        return res.status(400).json({ error: 'Exercise not found', code: 'VALIDATION' });
      }
      throw e;
    }
  } catch (err) {
    next(err);
  }
});
