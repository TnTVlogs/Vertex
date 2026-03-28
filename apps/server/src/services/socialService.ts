import db from './db';
import { v4 as uuidv4 } from 'uuid';

export const socialService = {
    async getUserIdByUsername(username: string): Promise<string | null> {
        const [users]: any = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        return users[0]?.id || null;
    },

    async areFriends(userId1: string, userId2: string): Promise<boolean> {
        const [friends]: any = await db.query(
            'SELECT * FROM friendships WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
            [userId1, userId2, userId2, userId1]
        );
        return friends.length > 0;
    },

    async requestExists(fromId: string, toId: string): Promise<boolean> {
        const [requests]: any = await db.query(
            'SELECT * FROM friend_requests WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)',
            [fromId, toId, toId, fromId]
        );
        return requests.length > 0;
    },

    async createFriendRequest(fromId: string, toId: string): Promise<string> {
        const id = uuidv4();
        await db.query(
            'INSERT INTO friend_requests (id, from_id, to_id, status) VALUES (?, ?, ?, "pending")',
            [id, fromId, toId]
        );
        return id;
    },

    async getUsernameById(userId: string): Promise<string | null> {
        const [users]: any = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        return users[0]?.username || null;
    },

    async getFriendRequests(userId: string): Promise<any[]> {
        const [rows]: any = await db.query(
            `SELECT fr.*, u.username as from_username, u2.username as to_username,
                    CASE WHEN fr.to_id = ? THEN 'incoming' ELSE 'outgoing' END as direction
             FROM friend_requests fr
             JOIN users u ON fr.from_id = u.id
             JOIN users u2 ON fr.to_id = u2.id
             WHERE (fr.to_id = ? OR fr.from_id = ?) AND fr.status = 'pending'`,
            [userId, userId, userId]
        );
        return rows;
    },

    async getRequestById(requestId: string): Promise<any> {
        const [requests]: any = await db.query('SELECT * FROM friend_requests WHERE id = ?', [requestId]);
        return requests[0];
    },

    async deleteRequest(requestId: string): Promise<void> {
        await db.query('DELETE FROM friend_requests WHERE id = ?', [requestId]);
    },

    async createFriendship(userId1: string, userId2: string): Promise<void> {
        const id = uuidv4();
        const [u1, u2] = [userId1, userId2].sort();
        await db.query(
            'INSERT IGNORE INTO friendships (id, user1_id, user2_id) VALUES (?, ?, ?)',
            [id, u1, u2]
        );
    },

    async getFriends(userId: string): Promise<any[]> {
        const [rows]: any = await db.query(
            `SELECT u.id, u.username, u.status, u.avatar_url 
             FROM friendships f
             JOIN users u ON (f.user1_id = u.id OR f.user2_id = u.id)
             WHERE (f.user1_id = ? OR f.user2_id = ?) AND u.id != ?`,
            [userId, userId, userId]
        );
        return rows;
    }
};
