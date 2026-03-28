import db from './db';

export const messageService = {
    async getChannelMessages(channelId: string): Promise<any[]> {
        const query = `
            SELECT m.*, u.username, u.avatar_url as avatarUrl 
            FROM messages m
            JOIN users u ON m.author_id = u.id
            WHERE m.channel_id = ?
            ORDER BY m.created_at ASC
        `;
        const [rows]: any = await db.query(query, [channelId]);
        return rows;
    },

    async getDirectMessages(userId1: string, userId2: string): Promise<any[]> {
        const query = `
            SELECT m.*, u.username, u.avatar_url as avatarUrl 
            FROM messages m
            JOIN users u ON m.author_id = u.id
            WHERE (m.author_id = ? AND m.recipient_id = ?) 
               OR (m.author_id = ? AND m.recipient_id = ?)
            ORDER BY m.created_at ASC
        `;
        const [rows]: any = await db.query(query, [userId1, userId2, userId2, userId1]);
        return rows;
    },

    formatMessage(row: any) {
        return {
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
        };
    }
};
