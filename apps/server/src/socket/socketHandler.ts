import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import db from '../services/db';
import { setPresence, publishMessage } from '../services/redisService';

// Track which userId is on which socket for disconnect handling
const socketToUser = new Map<string, string>();

export const handleSocketConnections = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        // console.log('User connected:', socket.id);

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
                // console.log(`User ${userId} disconnected`);
                socketToUser.delete(socket.id);
                
                // Setting to offline in DB
                await db.query('UPDATE users SET status = "offline" WHERE id = ?', [userId]);
                await setPresence(userId, 'offline');
                
                socket.broadcast.emit('presence-update', { userId, status: 'offline' });
            }
        });
    });
};
