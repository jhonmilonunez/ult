import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

export const attendanceRouter = express.Router();
attendanceRouter.use(requireAuth);

attendanceRouter.get('/', async (req, res, next) => {
  try {
    let { from, to } = req.query;
    if (!from || !to) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      from = start.toISOString().slice(0, 10);
      to = end.toISOString().slice(0, 10);
    }
    const { rows } = await query(
      `SELECT DATE(started_at) AS date, COUNT(*)::int AS session_count
       FROM sessions
       WHERE user_id = $1 AND started_at >= $2::date AND started_at <= ($3::date + INTERVAL '1 day')
       GROUP BY DATE(started_at)
       ORDER BY date`,
      [req.user.id, from, to]
    );
    const list = rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      session_count: r.session_count,
    }));
    res.json(list);
  } catch (err) {
    next(err);
  }
});
