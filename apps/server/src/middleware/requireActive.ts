import { Response, NextFunction } from 'express';
import { AuthRequest } from './requireAuth';
import prisma from '../services/prisma';
import logger from '../utils/logger';

// Middleware that ensures the authenticated user has ACTIVE status.
// Must be used AFTER requireAuth so req.user is guaranteed to be set.
export const requireActive = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { status: true },
        });

        if (!user) return res.status(401).json({ error: 'User not found' });

        if (user.status === 'PENDING') {
            return res.status(403).json({ error: 'Compte pendent de revisió per l\'administrador.' });
        }
        if (user.status === 'BANNED') {
            return res.status(403).json({ error: 'El teu compte ha estat suspès.' });
        }

        next();
    } catch (error) {
        logger.error({ err: error }, 'requireActive error');
        res.status(500).json({ error: 'Internal server error' });
    }
};
