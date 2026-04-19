import { Response } from 'express';
import { AuthRequest } from '../middleware/requireAuth';
import prisma from '../services/prisma';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

const SERVER_BASE_URL = (process.env.SERVER_BASE_URL ?? '').replace(/\/$/, '');

const authorSelect = { id: true, username: true, email: true, avatarUrl: true };

export const updateProfile = async (req: AuthRequest, res: Response) => {
    const { username } = req.body;
    const userId = req.user.userId;

    if (typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 32) {
        return res.status(400).json({ error: 'Username must be 2–32 characters' });
    }

    try {
        const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
        if (existing && existing.id !== userId) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { username: username.trim() },
            select: authorSelect,
        });

        res.json({ user });
    } catch (error) {
        logger.error({ err: error }, 'updateProfile error');
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
    const userId = req.user.userId;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { avatarUrl: true },
        });

        // Delete old local avatar
        if (currentUser?.avatarUrl?.includes('/uploads/avatars/')) {
            const filename = currentUser.avatarUrl.split('/uploads/avatars/')[1];
            const oldPath = path.join(process.cwd(), 'uploads', 'avatars', filename);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const avatarUrl = `${SERVER_BASE_URL}/uploads/avatars/${req.file.filename}`;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: authorSelect,
        });

        res.json({ user });
    } catch (error) {
        logger.error({ err: error }, 'uploadAvatar error');
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const uploadAttachment = async (req: AuthRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const url = `${SERVER_BASE_URL}/uploads/attachments/${req.file.filename}`;
    res.json({ url, filename: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size });
};
