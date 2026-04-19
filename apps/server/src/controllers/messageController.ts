import { Request, Response } from 'express';
import { messageService } from '../services/messageService';
import { AuthRequest } from '../middleware/requireAuth';
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
    },

    async searchMessages(req: Request, res: Response) {
        const channelId = req.query.channelId as string;
        const q = req.query.q as string;
        if (!channelId || !q || q.trim().length === 0) {
            return res.status(400).json({ error: 'channelId and q are required' });
        }
        if (q.length > 256) {
            return res.status(400).json({ error: 'Search query too long (max 256 chars)' });
        }
        const rawLimit = parseInt(req.query.limit as string, 10);
        const limit = isNaN(rawLimit) ? 50 : rawLimit;
        try {
            const rows = await messageService.searchMessages(channelId, q.trim(), limit);
            res.json({ messages: rows.map(messageService.formatMessage) });
        } catch (error) {
            logger.error({ err: error }, 'searchMessages error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async deleteMessage(req: AuthRequest, res: Response) {
        const messageId = req.params.messageId as string;
        const requesterId = req.user.userId;
        const isAdmin = (req.user as any).isAdmin === true;
        try {
            await messageService.softDeleteMessage(messageId, requesterId, isAdmin);
            res.status(204).send();
        } catch (error: any) {
            if (error.message === 'Message not found') return res.status(404).json({ error: error.message });
            if (error.message === 'Forbidden') return res.status(403).json({ error: error.message });
            logger.error({ err: error }, 'deleteMessage error');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
