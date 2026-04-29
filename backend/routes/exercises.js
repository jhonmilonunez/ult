import express from 'express';
import { query } from '../db.js';

export const exercisesRouter = express.Router();

exercisesRouter.get('/', async (req, res, next) => {
  try {
    const { q = '', category = '', equipment = '', limit = 20, offset = 0 } = req.query;
    const params = [];
    const conditions = [];
    let n = 1;
    if (q && String(q).trim()) {
      conditions.push(`LOWER(name) LIKE $${n}`);
      params.push(`%${String(q).trim().toLowerCase()}%`);
      n++;
    }
    if (category && String(category).trim()) {
      conditions.push(`category = $${n}`);
      params.push(String(category).trim());
      n++;
    }
    if (equipment && String(equipment).trim()) {
      conditions.push(`equipment = $${n}`);
      params.push(String(equipment).trim());
      n++;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Math.min(Number(limit) || 20, 100), Number(offset) || 0);
    const { rows } = await query(
      `SELECT id, name, category, equipment, created_at
       FROM exercises ${where}
       ORDER BY name
       LIMIT $${n} OFFSET $${n + 1}`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

exercisesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      rows: [row],
    } = await query(
      `SELECT id, name, category, equipment, created_at FROM exercises WHERE id = $1`,
      [id]
    );
    if (!row) {
      return res.status(404).json({ error: 'Exercise not found', code: 'NOT_FOUND' });
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
});
