import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

export const authRouter = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required', code: 'VALIDATION' });
    }
    const hash = await bcrypt.hash(password, 10);
    const {
      rows: [row],
    } = await query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [email.trim().toLowerCase(), name?.trim() || null, hash]
    );
    const token = signToken(row);
    return res.status(201).json({ token, user: { id: row.id, email: row.email, name: row.name } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered', code: 'CONFLICT' });
    }
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required', code: 'VALIDATION' });
    }
    const {
      rows: [row],
    } = await query(
      `SELECT id, email, name, password_hash FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'UNAUTHORIZED' });
    }
    const token = signToken(row);
    return res.json({ token, user: { id: row.id, email: row.email, name: row.name } });
  } catch (err) {
    next(err);
  }
});
