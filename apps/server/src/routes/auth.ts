import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../services/db';
import redisClient from '../services/redisService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dies

// ── REGISTER ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const id = uuidv4();

        await db.query(
            'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
            [id, username, email, passwordHash]
        );

        res.json({ user: { id, username, email } });
    } catch (error: any) {
        console.error('Registration error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'User already exists (email or username taken)' });
        }
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// ── LOGIN ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows]: any = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Access Token — curt (15 minuts)
        const accessToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        // Refresh Token — llarg (7 dies), opac (UUID)
        const refreshToken = uuidv4();

        // Guardar refresh token a Redis amb TTL de 7 dies
        if (redisClient.isOpen) {
            await redisClient.set(
                `refresh:${user.id}`,
                refreshToken,
                { EX: REFRESH_TOKEN_TTL_SECONDS }
            );
        }

        res.json({
            user: { id: user.id, username: user.username, email: user.email },
            accessToken,
            refreshToken
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// ── REFRESH ──────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
    const { refreshToken, userId } = req.body;

    if (!refreshToken || !userId) {
        return res.status(400).json({ error: 'Missing refreshToken or userId' });
    }

    try {
        // Verificar contra Redis
        if (!redisClient.isOpen) {
            return res.status(503).json({ error: 'Auth service temporarily unavailable' });
        }

        const storedToken = await redisClient.get(`refresh:${userId}`);

        if (!storedToken || storedToken !== refreshToken) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // Generar nou Access Token
        const accessToken = jwt.sign(
            { userId },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        // Opcional: renovar el TTL del refresh token a Redis
        await redisClient.expire(`refresh:${userId}`, REFRESH_TOKEN_TTL_SECONDS);

        res.json({ accessToken });
    } catch (error: any) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── LOGOUT ───────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
    const { userId } = req.body;
    if (userId && redisClient.isOpen) {
        await redisClient.del(`refresh:${userId}`);
    }
    res.json({ ok: true });
});

// ── ME ───────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        const [rows]: any = await db.query('SELECT id, username, email FROM users WHERE id = ?', [decoded.userId]);
        const user = rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;
