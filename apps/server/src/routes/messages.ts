import { Router } from 'express';
import db from '../services/db';

const router = Router();

// Get message history for a channel or DM
router.get('/:targetId', async (req, res) => {
    const { targetId } = req.params;
    const { type, userId } = req.query; 

    try {
        let query = '';
        let params: any[] = [];

        if (type === 'channel') {
            query = `
                SELECT m.*, u.username, u.avatar_url as avatarUrl 
                FROM messages m
                JOIN users u ON m.author_id = u.id
                WHERE m.channel_id = ?
                ORDER BY m.created_at ASC
            `;
            params = [targetId];
        } else if (type === 'dm') {
            // For DMs, we need messages where (author = me AND recipient = target) OR (author = target AND recipient = me)
            query = `
                SELECT m.*, u.username, u.avatar_url as avatarUrl 
                FROM messages m
                JOIN users u ON m.author_id = u.id
                WHERE (m.author_id = ? AND m.recipient_id = ?) 
                   OR (m.author_id = ? AND m.recipient_id = ?)
                ORDER BY m.created_at ASC
            `;
            params = [userId, targetId, targetId, userId];
        } else {
            return res.status(400).json({ error: 'Invalid message type' });
        }

        const [rows]: any = await db.query(query, params);
        
        // Format rows to match the expected Message model
        const messages = rows.map((row: any) => ({
            id: row.id,
            content: row.content,
            attachmentUrl: row.attachment_url,
            authorId: row.author_id,
            channelId: row.channel_id,
            recipientId: row.recipient_id,
            createdAt: row.created_at,
            author: {
                id: row.author_id,
                username: row.username,
                avatarUrl: row.avatarUrl
            }
        }));

        res.json(messages);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
