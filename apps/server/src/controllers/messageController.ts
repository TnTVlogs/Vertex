import { Request, Response } from 'express';
import { messageService } from '../services/messageService';

export const messageController = {
    async getMessages(req: Request, res: Response) {
        const { targetId } = req.params;
        const { type, userId } = req.query;

        try {
            let rows: any[] = [];

            if (type === 'channel') {
                rows = await messageService.getChannelMessages(targetId);
            } else if (type === 'dm') {
                if (!userId || typeof userId !== 'string') {
                    return res.status(400).json({ error: 'Missing userId for DMs' });
                }
                rows = await messageService.getDirectMessages(userId, targetId);
            } else {
                return res.status(400).json({ error: 'Invalid message type' });
            }

            const messages = rows.map(messageService.formatMessage);
            res.json(messages);
        } catch (error: any) {
            console.error('getMessages error:', error);
            res.status(500).json({ error: error.message });
        }
    }
};
