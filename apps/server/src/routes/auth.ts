import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../services/db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

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

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows]: any = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (user && await bcrypt.compare(password, user.password_hash)) {
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '24h' });
            res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

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
