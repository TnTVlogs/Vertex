import db from './db';
import { v4 as uuidv4 } from 'uuid';

export const serverService = {
    async createServer(name: string, ownerId: string): Promise<{ id: string; name: string; generalChannelId: string }> {
        const serverId = uuidv4();
        await db.query(
            'INSERT INTO servers (id, name, owner_id) VALUES (?, ?, ?)',
            [serverId, name, ownerId]
        );

        // Add owner as member
        const memberId = uuidv4();
        await db.query(
            'INSERT INTO members (id, server_id, user_id, role) VALUES (?, ?, ?, "owner")',
            [memberId, serverId, ownerId]
        );

        // Create default general channel
        const channelId = uuidv4();
        await db.query(
            'INSERT INTO channels (id, server_id, name) VALUES (?, ?, "general")',
            [channelId, serverId]
        );

        return { id: serverId, name, generalChannelId: channelId };
    },

    async getServersForUser(userId: string): Promise<any[]> {
        const [rows]: any = await db.query(
            `SELECT s.* 
             FROM servers s
             JOIN members m ON s.id = m.server_id
             WHERE m.user_id = ?`,
            [userId]
        );
        return rows;
    },

    async getChannelsForServer(serverId: string): Promise<any[]> {
        const [rows]: any = await db.query('SELECT * FROM channels WHERE server_id = ?', [serverId]);
        return rows;
    }
};
