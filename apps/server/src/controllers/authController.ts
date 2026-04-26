import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authService } from '../services/authService';
import redisClient from '../services/redisService';
import { AuthRequest } from '../middleware/requireAuth';
import { MAX_ACCOUNTS_PER_IP } from '../config/limits.config';
import logger from '../utils/logger';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Helper to extract the real client IP behind proxies
const getRealIp = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress ?? '0.0.0.0';
};

export const authController = {
    async register(req: Request, res: Response) {
        const { username, email, password } = req.body;
        try {
            const ip = getRealIp(req);

            const ipCount = await authService.countUsersByIp(ip);
            if (ipCount >= MAX_ACCOUNTS_PER_IP) {
                return res.status(429).json({
                    error: `S'ha superat el límit de ${MAX_ACCOUNTS_PER_IP} comptes per adreça IP.`
                });
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const user = await authService.createUser(username, email, passwordHash, ip);

            res.status(201).json({
                user,
                message: 'Compte creat. Espera l\'aprovació de l\'administrador per poder iniciar sessió.'
            });
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY' || error.code === 'P2002') {
                const field = error.meta?.constraint?.index?.includes('email') ? 'email' : 'username'
                return res.status(409).json({ error: `Aquest ${field} ja està registrat.` });
            }
            logger.error({ err: error }, 'register error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async login(req: Request, res: Response) {
        const { email, password } = req.body;
        try {
            const user = await authService.getUserByEmail(email);

            if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (user.status === 'PENDING') {
                return res.status(403).json({ error: 'Compte pendent de revisió per l\'administrador.' });
            }
            if (user.status === 'BANNED') {
                return res.status(403).json({ error: 'El teu compte ha estat suspès.' });
            }

            const accessToken = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET!,
                { expiresIn: '15m' }
            );

            const refreshToken = uuidv4();

            if (redisClient.isOpen) {
                await redisClient.set(`rt:${refreshToken}`, user.id, {
                    EX: REFRESH_TOKEN_TTL_SECONDS
                });
            }

            res.json({
                user: { id: user.id, username: user.username, email: user.email, status: user.status, tier: user.tier, isAdmin: user.isAdmin },
                accessToken,
                refreshToken
            });
        } catch (error) {
            logger.error({ err: error }, 'login error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async refresh(req: Request, res: Response) {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Missing refreshToken' });
        }

        try {
            if (!redisClient.isOpen) {
                return res.status(503).json({ error: 'Auth service temporarily unavailable' });
            }

            const userId = await redisClient.get(`rt:${refreshToken}`);

            if (!userId) {
                return res.status(401).json({ error: 'Invalid or expired refresh token' });
            }

            const accessToken = jwt.sign(
                { userId },
                process.env.JWT_SECRET!,
                { expiresIn: '15m' }
            );

            // Rotate: delete old token, issue new one
            const newRefreshToken = uuidv4();
            await redisClient.del(`rt:${refreshToken}`);
            await redisClient.set(`rt:${newRefreshToken}`, userId, {
                EX: REFRESH_TOKEN_TTL_SECONDS
            });

            res.json({ accessToken, refreshToken: newRefreshToken });
        } catch (error) {
            logger.error({ err: error }, 'refresh error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async logout(req: Request, res: Response) {
        const { refreshToken } = req.body;
        if (refreshToken && redisClient.isOpen) {
            await redisClient.del(`rt:${refreshToken}`);
        }
        res.json({ ok: true });
    },

    async me(req: AuthRequest, res: Response) {
        try {
            const user = await authService.getUserById(req.user.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json({ user });
        } catch (error) {
            logger.error({ err: error }, 'me error');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
