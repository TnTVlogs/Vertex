import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { setPresence, publishMessage, refreshPresenceTTL } from '../services/redisService';
import { messageService } from '../services/messageService';
import { serverService } from '../services/serverService';
import { TIER_LIMITS, Tier } from '../config/limits.config';
import logger from '../utils/logger';

const socketToUser = new Map<string, string>();

// In-memory rate limit: 20 messages/minute per socket
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkSocketRateLimit(socketId: string): boolean {
    const now = Date.now();
    const entry = socketRateLimits.get(socketId);
    if (!entry || now > entry.resetAt) {
        socketRateLimits.set(socketId, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= 20) return false;
    entry.count++;
    return true;
}

const ALLOWED_ATTACHMENT_HOSTS = (process.env.ALLOWED_ATTACHMENT_HOSTS ?? '')
    .split(',').map(h => h.trim()).filter(Boolean);

function isValidAttachmentUrl(url: string): boolean {
    if (ALLOWED_ATTACHMENT_HOSTS.length === 0) return false;
    try {
        const { hostname } = new URL(url);
        return ALLOWED_ATTACHMENT_HOSTS.includes(hostname);
    } catch { return false; }
}

const sendMessageSchema = z.object({
    content: z.string().min(1).max(2000),
    channelId: z.string().uuid().optional().nullable(),
    recipientId: z.string().uuid().optional().nullable(),
    attachmentUrl: z.string().url().optional().nullable(),
}).refine(d => d.channelId || d.recipientId, 'Channel or recipient required');

export const handleSocketConnections = (io: Server) => {
    // Item 1: JWT auth middleware — all connections must provide valid token
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('Auth required'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
            socket.data.userId = decoded.userId;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {

        socket.on('join-user', async (userId: string) => {
            // Verify claimed userId matches JWT
            if (userId !== socket.data.userId) {
                socket.emit('error', { message: 'Unauthorized' });
                return;
            }
            socket.join(`user:${userId}`);
            socketToUser.set(socket.id, userId);
            await setPresence(userId, 'online');
            socket.broadcast.emit('presence-update', { userId, status: 'online' });
        });

        socket.on('join-channel', async (channelId: string) => {
            const userId = socket.data.userId as string;
            // Item 1: verify user is member of this channel's server
            const isMember = await serverService.isUserMemberOfChannel(userId, channelId);
            if (!isMember) {
                socket.emit('error', { message: 'Access denied' });
                return;
            }
            socket.join(`channel:${channelId}`);
        });

        socket.on('send-message', async (data, callback) => {
            const userId = socket.data.userId as string;

            // Item 3: rate limit
            if (!checkSocketRateLimit(socket.id)) {
                if (callback) callback({ error: 'Rate limit exceeded. Max 20 messages/minute.' });
                return;
            }

            // Item 2: schema validation
            const parsed = sendMessageSchema.safeParse(data);
            if (!parsed.success) {
                if (callback) callback({ error: parsed.error.errors[0]?.message ?? 'Invalid data' });
                return;
            }

            const { content, channelId, recipientId, attachmentUrl } = parsed.data;

            if (attachmentUrl && !isValidAttachmentUrl(attachmentUrl)) {
                if (callback) callback({ error: 'Invalid attachment URL' });
                return;
            }

            // Use userId from JWT — never trust client-supplied authorId
            const authorId = userId;

            try {
                const user = await messageService.getUserTierInfo(authorId);

                if (!user || user.status !== 'ACTIVE') {
                    const errorMsg = 'Compte pendent o suspès. No pots enviar missatges.';
                    if (callback) callback({ error: errorMsg });
                    else socket.emit('error', { message: errorMsg });
                    return;
                }

                const tier = (user.tier as Tier) ?? 'BASIC';
                const limits = TIER_LIMITS[tier] ?? TIER_LIMITS['BASIC'];

                if (content.length > limits.maxMessageLength) {
                    const errorMsg = `El missatge supera el límit de ${limits.maxMessageLength} caràcters (Tier ${tier}).`;
                    if (callback) callback({ error: errorMsg });
                    else socket.emit('error', { message: errorMsg });
                    return;
                }

                const todayCount = await messageService.countTodayMessages(authorId);
                if (todayCount >= limits.maxDailyMessages) {
                    const errorMsg = `Has superat el límit de ${limits.maxDailyMessages} missatges diaris (Tier ${tier}).`;
                    if (callback) callback({ error: errorMsg });
                    else socket.emit('error', { message: errorMsg });
                    return;
                }

                const message = await messageService.createMessage({
                    authorId,
                    content,
                    channelId: channelId ?? undefined,
                    recipientId: recipientId ?? undefined,
                    attachmentUrl: attachmentUrl ?? undefined
                });

                if (channelId) {
                    io.to(`channel:${channelId}`).emit('message', message);
                } else if (recipientId) {
                    io.to(`user:${recipientId}`).to(`user:${authorId}`).emit('message', message);
                }

                await publishMessage('chat-events', message);
                await refreshPresenceTTL(authorId);

                if (callback) callback({ status: 'ok', messageId: message.id });
            } catch (error) {
                logger.error({ err: error }, 'Error saving message');
                if (callback) callback({ error: 'Error intern en enviar el missatge.' });
                else socket.emit('error', { message: 'Error intern en enviar el missatge.' });
            }
        });

        socket.on('disconnect', async () => {
            socketRateLimits.delete(socket.id);
            const userId = socketToUser.get(socket.id);
            if (userId) {
                socketToUser.delete(socket.id);
                await setPresence(userId, 'offline');
                socket.broadcast.emit('presence-update', { userId, status: 'offline' });
            }
        });
    });
};
