import express from 'express';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Environment variables required:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('Supabase URL or service role key is not set. Supabase auth routes will fail.');
}

// Helper to call Supabase REST API for the poetry_users table
async function supabaseInsertUser(payload: any): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/poetry_users`;
  const headers = {
    apiKey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
  const resp = await axios.post(url, payload, { headers });
  return resp.data as any[];
}

async function supabaseSelectUserByEmail(email: string): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/poetry_users`;
  const headers = {
    apiKey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
  // filter by email eq.
  const resp = await axios.get(url, { headers, params: { 'select': '*', 'email': `eq.${email}` } });
  return resp.data as any[];
}

// Signup: create a poetry_users row (server does hashing) -- expects { username, email, password }
router.post('/supabase-signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ msg: 'Missing fields' });

  try {
    // check existing
    const existing = await supabaseSelectUserByEmail(email);
    if (existing && existing.length > 0) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // create UUID on client side by Postgres default; but REST insert must provide an object. We'll omit id so Postgres generates it.
    const payload = [{ username, email, password_hash: hash }];
    const created = await supabaseInsertUser(payload);
    return res.status(201).json({ msg: 'User created', user: created[0] });
  } catch (err: any) {
    console.error('Supabase signup error', err?.response?.data || err.message || err);
    return res.status(500).json({ msg: 'Error creating user' });
  }
});

// Login: verify password against poetry_users row by email
router.post('/supabase-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ msg: 'Missing fields' });

  try {
    const rows = await supabaseSelectUserByEmail(email);
    if (!rows || rows.length === 0) return res.status(400).json({ msg: 'Invalid credentials' });
    const user = rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ msg: 'Invalid credentials' });

    // Sign a JWT for the app using server secret
    // NOTE: this JWT is for your app; Supabase will not automatically accept it for RLS unless configured
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user.id, isAdmin: user.is_admin }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '1h' });

    return res.status(200).json({ token, isAdmin: user.is_admin });
  } catch (err: any) {
    console.error('Supabase login error', err?.response?.data || err.message || err);
    return res.status(500).json({ msg: 'Error logging in' });
  }
});

export default router;
