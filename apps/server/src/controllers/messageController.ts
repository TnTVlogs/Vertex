import { Request, Response } from 'express';
import { messageService } from '../services/messageService';
import logger from '../utils/logger';

export const messageController = {
    async getMessages(req: Request, res: Response) {
        const targetId = req.params.targetId as string;
        const { type, userId, before } = req.query;

        const rawLimit = parseInt(req.query.limit as string, 10);
        const limit = isNaN(rawLimit) ? 50 : rawLimit;

        const beforeDate = before && typeof before === 'string' ? new Date(before) : undefined;

        try {
            let rows: any[] = [];

            if (type === 'channel') {
                rows = await messageService.getChannelMessages(targetId, limit, beforeDate);
            } else if (type === 'dm') {
                if (!userId || typeof userId !== 'string') {
                    return res.status(400).json({ error: 'Missing userId for DMs' });
                }
                rows = await messageService.getDirectMessages(userId, targetId, limit, beforeDate);
            } else {
                return res.status(400).json({ error: 'Invalid message type' });
            }

            const messages = rows.map(messageService.formatMessage);
            res.json({ messages, hasMore: messages.length === limit });
        } catch (error) {
            logger.error({ err: error }, 'getMessages error');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
