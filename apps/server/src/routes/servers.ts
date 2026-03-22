import { Router } from 'express';
import db from '../services/db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create server
router.post('/create', async (req, res) => {
    const { name, ownerId } = req.body;
    try {
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

        res.json({ id: serverId, name, generalChannelId: channelId });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get servers for a user
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows]: any = await db.query(
            `SELECT s.* 
             FROM servers s
             JOIN members m ON s.id = m.server_id
             WHERE m.user_id = ?`,
            [userId]
        );
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get channels for a server
router.get('/:serverId/channels', async (req, res) => {
    const { serverId } = req.params;
    try {
        const [rows]: any = await db.query('SELECT * FROM channels WHERE server_id = ?', [serverId]);
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
