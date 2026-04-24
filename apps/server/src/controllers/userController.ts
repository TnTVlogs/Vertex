import { Response } from 'express';
import { AuthRequest } from '../middleware/requireAuth';
import prisma from '../services/prisma';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const AUDIO_TRANSCODE_MIMES = new Set(['audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/m4a']);

function transcodeToMp3(inputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const outputPath = inputPath.replace(/\.[^.]+$/, '.mp3');
        const ff = spawn('ffmpeg', ['-i', inputPath, '-vn', '-acodec', 'libmp3lame', '-ab', '128k', '-y', outputPath]);
        ff.stderr.on('data', () => {});
        ff.on('error', reject);
        ff.on('close', (code) => {
            if (code === 0) { fs.unlink(inputPath, () => {}); resolve(outputPath); }
            else reject(new Error(`ffmpeg exit ${code}`));
        });
    });
}

const SERVER_BASE_URL = (process.env.SERVER_BASE_URL ?? '').replace(/\/$/, '');

const authorSelect = { id: true, username: true, displayName: true, avatarUrl: true };

export const updateProfile = async (req: AuthRequest, res: Response) => {
    const { displayName } = req.body;
    const userId = req.user.userId;

    if (typeof displayName !== 'string' || displayName.trim().length < 1 || displayName.trim().length > 50) {
        return res.status(400).json({ error: 'Display name must be 1–50 characters' });
    }

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { displayName: displayName.trim() },
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

    let filename = req.file.filename;
    let mimetype = req.file.mimetype;

    if (AUDIO_TRANSCODE_MIMES.has(mimetype)) {
        try {
            const outputPath = await transcodeToMp3(req.file.path);
            filename = path.basename(outputPath);
            mimetype = 'audio/mpeg';
        } catch (err) {
            logger.warn({ err }, 'Audio transcode on upload failed, serving original');
        }
    }

    const url = `${SERVER_BASE_URL}/uploads/attachments/${filename}`;
    res.json({ url, filename: req.file.originalname, mimetype, size: req.file.size });
};
