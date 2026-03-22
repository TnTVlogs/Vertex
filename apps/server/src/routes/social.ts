import { Router } from 'express';
import db from '../services/db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Send friend request
router.post('/request', async (req, res) => {
    const { fromId, toUsername } = req.body;
    try {
        // Find toUser by username
        const [users]: any = await db.query('SELECT id FROM users WHERE username = ?', [toUsername]);
        const toUser = users[0];

        if (!toUser) return res.status(404).json({ error: 'User not found' });
        if (toUser.id === fromId) return res.status(400).json({ error: 'You cannot add yourself' });

        // Check if already friends
        const [friends]: any = await db.query(
            'SELECT * FROM friendships WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
            [fromId, toUser.id, toUser.id, fromId]
        );
        if (friends.length > 0) return res.status(400).json({ error: 'You are already friends' });

        // Check for existing request in either direction
        const [requests]: any = await db.query(
            'SELECT * FROM friend_requests WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)',
            [fromId, toUser.id, toUser.id, fromId]
        );
        if (requests.length > 0) return res.status(400).json({ error: 'A friend request already exists between you' });

        const id = uuidv4();
        await db.query(
            'INSERT INTO friend_requests (id, from_id, to_id, status) VALUES (?, ?, ?, "pending")',
            [id, fromId, toUser.id]
        );

        // Emit real-time notification
        const io = req.app.get('io');
        const [fromUsers]: any = await db.query('SELECT username FROM users WHERE id = ?', [fromId]);
        io.to(`user:${toUser.id}`).emit('friend-request', {
            id,
            from_id: fromId,
            to_id: toUser.id,
            from_username: fromUsers[0].username,
            status: 'pending'
        });

        res.json({ message: 'Friend request sent' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get friend requests for a user (both incoming and outgoing)
router.get('/requests/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log(`Fetching requests for userId: ${userId}`);
    try {
        const [rows]: any = await db.query(
            `SELECT fr.*, u.username as from_username, u2.username as to_username,
                    CASE WHEN fr.to_id = ? THEN 'incoming' ELSE 'outgoing' END as direction
             FROM friend_requests fr
             JOIN users u ON fr.from_id = u.id
             JOIN users u2 ON fr.to_id = u2.id
             WHERE (fr.to_id = ? OR fr.from_id = ?) AND fr.status = 'pending'`,
            [userId, userId, userId]
        );
        console.log(`Found ${rows.length} pending requests for user ${userId}`);
        res.json(rows);
    } catch (error: any) {
        console.error('Error in GET /requests:', error);
        res.status(500).json({ error: error.message });
    }
});

// Accept/Decline friend request
router.post('/request/respond', async (req, res) => {
    const { requestId, status } = req.body; // 'accepted' or 'declined'
    try {
        const [requests]: any = await db.query('SELECT * FROM friend_requests WHERE id = ?', [requestId]);
        const request = requests[0];

        if (!request) return res.status(404).json({ error: 'Request not found' });

        // Delete the request from DB as requested
        await db.query('DELETE FROM friend_requests WHERE id = ?', [requestId]);

        if (status === 'accepted') {
            const id = uuidv4();
            // Order user IDs to ensure unique pair (smaller ID first)
            const [u1, u2] = [request.from_id, request.to_id].sort();
            await db.query(
                'INSERT IGNORE INTO friendships (id, user1_id, user2_id) VALUES (?, ?, ?)',
                [id, u1, u2]
            );
        }

        // Notify the original sender
        const io = req.app.get('io');
        io.to(`user:${request.from_id}`).emit('friend-response', {
            requestId,
            status,
            to_id: request.to_id
        });

        res.json({ message: `Request ${status}` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get friends list
router.get('/friends/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows]: any = await db.query(
            `SELECT u.id, u.username, u.status, u.avatar_url 
             FROM friendships f
             JOIN users u ON (f.user1_id = u.id OR f.user2_id = u.id)
             WHERE (f.user1_id = ? OR f.user2_id = ?) AND u.id != ?`,
            [userId, userId, userId]
        );
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
