import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

export const setsRouter = express.Router();
setsRouter.use(requireAuth);

async function getSetForUser(setId, userId) {
  const {
    rows: [row],
  } = await query(
    `SELECT es.id, es.session_id, es.exercise_id, es.set_number, es.weight_kg, es.reps, es.created_at, s.user_id
     FROM exercise_sets es
     JOIN sessions s ON s.id = es.session_id
     WHERE es.id = $1`,
    [setId]
  );
  if (!row) return { status: 404 };
  if (row.user_id !== userId) return { status: 403 };
  return { set: row };
}

setsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const check = await getSetForUser(id, req.user.id);
    if (check.status) {
      return res.status(check.status).json({
        error: check.status === 404 ? 'Set not found' : 'Forbidden',
        code: check.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN',
      });
    }
    const { weight_kg, reps } = req.body ?? {};
    const updates = [];
    const params = [];
    let n = 1;
    if (reps !== undefined) {
      const r = Number(reps);
      if (!Number.isInteger(r) || r < 1) {
        return res.status(400).json({ error: 'reps must be a positive integer', code: 'VALIDATION' });
      }
      updates.push(`reps = $${n++}`);
      params.push(r);
    }
    if (weight_kg !== undefined) {
      const w = weight_kg === null || weight_kg === '' ? null : Number(weight_kg);
      if (w != null && (Number.isNaN(w) || w < 0)) {
        return res.status(400).json({ error: 'weight_kg must be non-negative or null', code: 'VALIDATION' });
      }
      updates.push(`weight_kg = $${n++}`);
      params.push(w);
    }
    if (updates.length === 0) {
      return res.json(check.set);
    }
    params.push(id);
    const {
      rows: [updated],
    } = await query(
      `UPDATE exercise_sets SET ${updates.join(', ')} WHERE id = $${n}
       RETURNING id, session_id, exercise_id, set_number, weight_kg, reps, created_at`,
      params
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

setsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const check = await getSetForUser(id, req.user.id);
    if (check.status) {
      return res.status(check.status).json({
        error: check.status === 404 ? 'Set not found' : 'Forbidden',
        code: check.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN',
      });
    }
    await query(`DELETE FROM exercise_sets WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
