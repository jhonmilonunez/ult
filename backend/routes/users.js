import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

export const usersRouter = express.Router();
usersRouter.use(requireAuth);

usersRouter.get('/me', async (req, res, next) => {
  try {
    const {
      rows: [row],
    } = await query(
      `SELECT id, email, name FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!row) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }
    res.json({ id: row.id, email: row.email, name: row.name });
  } catch (err) {
    next(err);
  }
});
