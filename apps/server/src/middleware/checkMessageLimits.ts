import { Response, NextFunction } from 'express';
import { AuthRequest } from './requireAuth';
import { messageService } from '../services/messageService';
import { TIER_LIMITS, Tier } from '../config/limits.config';
import prisma from '../services/prisma';
import logger from '../utils/logger';

// Middleware that enforces per-tier message length and daily quota limits.
// Must be used AFTER requireAuth and requireActive.
export const checkMessageLimits = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { content } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { tier: true },
        });
        if (!user) return res.status(401).json({ error: 'User not found' });

        const tier = (user.tier as Tier) ?? 'BASIC';
        const limits = TIER_LIMITS[tier] ?? TIER_LIMITS['BASIC'];

        if (content && content.length > limits.maxMessageLength) {
            return res.status(400).json({
                error: `El missatge supera el límit de ${limits.maxMessageLength} caràcters per al teu tier (${tier}).`
            });
        }

        const todayCount = await messageService.countTodayMessages(userId);
        if (todayCount >= limits.maxDailyMessages) {
            return res.status(429).json({
                error: `Has superat el límit de ${limits.maxDailyMessages} missatges diaris per al teu tier (${tier}).`
            });
        }

        next();
    } catch (error) {
        logger.error({ err: error }, 'checkMessageLimits error');
        res.status(500).json({ error: 'Internal server error' });
    }
};
