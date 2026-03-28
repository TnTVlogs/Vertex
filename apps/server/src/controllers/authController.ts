import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authService } from '../services/authService';
import redisClient from '../services/redisService';
import { AuthRequest } from '../middleware/requireAuth';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const authController = {
    async register(req: Request, res: Response) {
        const { username, email, password } = req.body;
        try {
            const passwordHash = await bcrypt.hash(password, 10);
            const user = await authService.createUser(username, email, passwordHash);
            res.json({ user });
        } catch (error: any) {
            console.error('Registration error:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'User already exists (email or username taken)' });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async login(req: Request, res: Response) {
        const { email, password } = req.body;
        try {
            const user = await authService.getUserByEmail(email);

            if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const accessToken = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET!,
                { expiresIn: '15m' }
            );

            const refreshToken = uuidv4();

            if (redisClient.isOpen) {
                await redisClient.set(`refresh:${user.id}`, refreshToken, {
                    EX: REFRESH_TOKEN_TTL_SECONDS
                });
            }

            res.json({
                user: { id: user.id, username: user.username, email: user.email },
                accessToken,
                refreshToken
            });
        } catch (error: any) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async refresh(req: Request, res: Response) {
        const { refreshToken, userId } = req.body;

        if (!refreshToken || !userId) {
            return res.status(400).json({ error: 'Missing refreshToken or userId' });
        }

        try {
            if (!redisClient.isOpen) {
                return res.status(503).json({ error: 'Auth service temporarily unavailable' });
            }

            const storedToken = await redisClient.get(`refresh:${userId}`);

            if (!storedToken || storedToken !== refreshToken) {
                return res.status(401).json({ error: 'Invalid or expired refresh token' });
            }

            const accessToken = jwt.sign(
                { userId },
                process.env.JWT_SECRET!,
                { expiresIn: '15m' }
            );

            await redisClient.expire(`refresh:${userId}`, REFRESH_TOKEN_TTL_SECONDS);

            res.json({ accessToken });
        } catch (error: any) {
            console.error('Refresh error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async logout(req: Request, res: Response) {
        const { userId } = req.body;
        if (userId && redisClient.isOpen) {
            await redisClient.del(`refresh:${userId}`);
        }
        res.json({ ok: true });
    },

    async me(req: AuthRequest, res: Response) {
        try {
            // req.user is guaranteed to be set by requireAuth middleware
            const user = await authService.getUserById(req.user!.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json({ user });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
