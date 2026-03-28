import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis, setPresence, publishMessage } from './services/redisService';
import { v4 as uuidv4 } from 'uuid';
import authRoutes from './routes/auth';
import socialRoutes from './routes/social';
import serverRoutes from './routes/servers';
import messagesRoutes from './routes/messages';
import db from './services/db';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'] // Prioritize websocket for stability through Apache
});

app.set('io', io);

app.use(cors());
app.use(express.json());

// Routes prefixed with /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/servers', serverRoutes);
app.use('/api/v1/messages', messagesRoutes);

// Initialize services
const init = async () => {
    try {
        // mysql2 pool is lazy and tests itself on first call or via db.ts
        await connectRedis();
    } catch (error) {
        console.error('Failed to initialize services:', error);
    }
};

init();

// Track which userId is on which socket for disconnect handling
const socketToUser = new Map<string, string>();

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-user', async (userId: string) => {
        socket.join(`user:${userId}`);
        socketToUser.set(socket.id, userId);
        
        // Update MariaDB to online
        await db.query('UPDATE users SET status = "online" WHERE id = ?', [userId]);
        
        await setPresence(userId, 'online');
        // Notify others about presence
        socket.broadcast.emit('presence-update', { userId, status: 'online' });
    });

    socket.on('join-channel', (channelId: string) => {
        socket.join(`channel:${channelId}`);
    });

    socket.on('send-message', async (data) => {
        const { authorId, content, channelId, recipientId, attachmentUrl } = data;

        try {
            // 1. Persist to MariaDB (via Direct SQL)
            const id = uuidv4();
            await db.query(
                'INSERT INTO messages (id, content, attachment_url, author_id, channel_id, recipient_id) VALUES (?, ?, ?, ?, ?, ?)',
                [id, content, attachmentUrl, authorId, channelId || null, recipientId || null]
            );

            // Fetch author info for the broadcast
            const [rows]: any = await db.query('SELECT id, username, avatar_url as avatarUrl FROM users WHERE id = ?', [authorId]);
            const author = rows[0];

            const message = {
                id,
                content,
                attachmentUrl,
                authorId,
                channelId,
                recipientId,
                createdAt: new Date(),
                author
            };

            // 2. Publish to Socket.io
            if (channelId) {
                io.to(`channel:${channelId}`).emit('message', message);
            } else if (recipientId) {
                io.to(`user:${recipientId}`).to(`user:${authorId}`).emit('message', message);
            }

            await publishMessage('chat-events', message);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on('disconnect', async () => {
        const userId = socketToUser.get(socket.id);
        if (userId) {
            console.log(`User ${userId} disconnected`);
            socketToUser.delete(socket.id);
            
            // Check if user has other active sockets (optional, but for simplicity we assume 1:1 for now)
            // Setting to offline in DB
            await db.query('UPDATE users SET status = "offline" WHERE id = ?', [userId]);
            await setPresence(userId, 'offline');
            
            socket.broadcast.emit('presence-update', { userId, status: 'offline' });
        } else {
            console.log('Anonymous socket disconnected');
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Vertex Server running on port ${PORT}`);
});
