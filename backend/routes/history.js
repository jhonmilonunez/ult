import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

export const historyRouter = express.Router();
historyRouter.use(requireAuth);

historyRouter.get('/:exerciseId/history', async (req, res, next) => {
  try {
    const { exerciseId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const { rows: sessionRows } = await query(
      `SELECT s.id, s.started_at
       FROM sessions s
       JOIN exercise_sets es ON es.session_id = s.id AND es.exercise_id = $2
       WHERE s.user_id = $1
       GROUP BY s.id, s.started_at
       ORDER BY s.started_at DESC
       LIMIT $3`,
      [req.user.id, exerciseId, limit]
    );
    const sessions = [];
    for (const s of sessionRows) {
      const { rows: setRows } = await query(
        `SELECT id, set_number, weight_kg, reps, created_at
         FROM exercise_sets
         WHERE session_id = $1 AND exercise_id = $2
         ORDER BY created_at`,
        [s.id, exerciseId]
      );
      sessions.push({
        session_id: s.id,
        started_at: s.started_at,
        sets: setRows.map((r) => ({
          id: r.id,
          set_number: r.set_number,
          weight_kg: r.weight_kg != null ? Number(r.weight_kg) : null,
          reps: r.reps,
          created_at: r.created_at,
        })),
      });
    }
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});
