import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { setPresence, refreshPresenceTTL } from '../services/redisService';
import redisClient from '../services/redisService';
import { messageService } from '../services/messageService';
import { serverService } from '../services/serverService';
import { serverSettingsService } from '../services/serverSettingsService';
import { Tier } from '../config/limits.config';
import { getLimits } from '../services/tierService';
import logger from '../utils/logger';
import { registerCallHandler } from './callHandler';
import { registerChannelCallHandler } from './channelCallHandler';

const socketToUser = new Map<string, string>();
const userToSockets = new Map<string, Set<string>>();

function addUserSocket(userId: string, socketId: string) {
    if (!userToSockets.has(userId)) userToSockets.set(userId, new Set());
    userToSockets.get(userId)!.add(socketId);
}

function removeUserSocket(userId: string, socketId: string) {
    const sockets = userToSockets.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) userToSockets.delete(userId);
}

const SOCKET_RATE_LIMIT_MAX = 20;        // messages per window
const SOCKET_RATE_LIMIT_WINDOW_S = 60;   // window in seconds (Redis TTL)
const SOCKET_RATE_LIMIT_WINDOW_MS = 60_000; // window in ms (in-memory fallback)

const socketRateLimitsLocal = new Map<string, { count: number; resetAt: number }>();

async function checkSocketRateLimit(socketId: string): Promise<boolean> {
    if (redisClient.isOpen) {
        const key = `rl:${socketId}`;
        const count = await redisClient.incr(key);
        if (count === 1) await redisClient.expire(key, SOCKET_RATE_LIMIT_WINDOW_S);
        return count <= SOCKET_RATE_LIMIT_MAX;
    }
    // Fallback: in-memory
    const now = Date.now();
    const entry = socketRateLimitsLocal.get(socketId);
    if (!entry || now > entry.resetAt) {
        socketRateLimitsLocal.set(socketId, { count: 1, resetAt: now + SOCKET_RATE_LIMIT_WINDOW_MS });
        return true;
    }
    if (entry.count >= SOCKET_RATE_LIMIT_MAX) return false;
    entry.count++;
    return true;
}

const ALLOWED_ATTACHMENT_HOSTS = (process.env.ALLOWED_ATTACHMENT_HOSTS ?? '')
    .split(',').map(h => h.trim()).filter(Boolean);

const SELF_HOSTS = [
    ...(process.env.SERVER_BASE_URL ? [new URL(process.env.SERVER_BASE_URL).hostname] : []),
    ...(process.env.ALLOWED_ORIGINS ?? '').split(',').map(o => {
        try { return new URL(o.trim()).hostname; } catch { return ''; }
    }).filter(Boolean),
];

function isValidAttachmentUrl(url: string): boolean {
    try {
        const { hostname } = new URL(url);
        return ALLOWED_ATTACHMENT_HOSTS.includes(hostname) || SELF_HOSTS.includes(hostname);
    } catch { return false; }
}

const sendMessageSchema = z.object({
    content: z.string().max(2000).default(''),
    channelId: z.string().uuid().optional().nullable(),
    recipientId: z.string().uuid().optional().nullable(),
    attachmentUrl: z.string().url().optional().nullable(),
}).refine(d => d.channelId || d.recipientId, 'Channel or recipient required')
  .refine(d => d.content.trim().length > 0 || d.attachmentUrl, 'Message must have content or attachment');

export const handleSocketConnections = (io: Server) => {
    // Item 1: JWT auth middleware — all connections must provide valid token
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('Auth required'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
            socket.data.userId = decoded.userId;
            socket.data.sessionId = uuidv4();
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
            addUserSocket(userId, socket.id);
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

        socket.on('join-server', async (serverId: string) => {
            const userId = socket.data.userId as string;
            const isMember = await serverService.isUserMemberOfServer(userId, serverId);
            if (isMember) socket.join(`server:${serverId}`);
        });

        socket.on('send-message', async (data, callback) => {
            const userId = socket.data.userId as string;
            const sessionId = socket.data.sessionId as string;
            const msgCtx = { userId, sessionId };

            const socketError = (code: string, message: string) => {
                if (callback) callback({ success: false, error: { code, message } });
                else socket.emit('error', { code, message });
            };

            // Item 3: rate limit
            if (!await checkSocketRateLimit(socket.id)) {
                socketError('RATE_LIMIT', 'Rate limit exceeded. Max 20 messages/minute.');
                return;
            }

            // Item 2: schema validation
            const parsed = sendMessageSchema.safeParse(data);
            if (!parsed.success) {
                socketError('INVALID_DATA', parsed.error.issues[0]?.message ?? 'Invalid data');
                return;
            }

            const { content, channelId, recipientId, attachmentUrl } = parsed.data;

            if (attachmentUrl && !isValidAttachmentUrl(attachmentUrl)) {
                socketError('INVALID_ATTACHMENT', 'Invalid attachment URL');
                return;
            }

            // Use userId from JWT — never trust client-supplied authorId
            const authorId = userId;

            try {
                logger.info(msgCtx, 'send-message started');
                const user = await messageService.getUserTierInfo(authorId);

                if (!user || user.status !== 'ACTIVE') {
                    socketError('ACCOUNT_SUSPENDED', 'Compte pendent o suspès. No pots enviar missatges.');
                    return;
                }

                const tier = (user.tier as Tier) ?? 'BASIC';
                const limits = await getLimits(tier);

                if (content.length > limits.maxMessageLength) {
                    socketError('MESSAGE_TOO_LONG', `El missatge supera el límit de ${limits.maxMessageLength} caràcters (Tier ${tier}).`);
                    return;
                }

                const todayCount = await messageService.countTodayMessages(authorId);
                if (todayCount >= limits.maxDailyMessages) {
                    socketError('DAILY_LIMIT', `Has superat el límit de ${limits.maxDailyMessages} missatges diaris (Tier ${tier}).`);
                    return;
                }

                // Check server-level mute when sending to a channel
                if (channelId) {
                    const channel = await serverService.getChannelById(channelId);
                    if (channel) {
                        const memberStatus = await serverSettingsService.getMemberStatus(channel.serverId, authorId);
                        if (memberStatus?.isBanned) {
                            socketError('BANNED', 'Estàs banejar d\'aquest servidor.');
                            return;
                        }
                        if (memberStatus?.isMuted) {
                            const stillMuted = !memberStatus.mutedUntil || memberStatus.mutedUntil > new Date();
                            if (stillMuted) {
                                socketError('MUTED', 'Estàs silenciat en aquest servidor.');
                                return;
                            }
                            // Auto-clear expired mute
                            await serverSettingsService.unmuteMember(channel.serverId, authorId);
                        }
                    }
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
                    const targetUserIds = [recipientId, authorId];
                    for (const targetUserId of targetUserIds) {
                        const sockets = userToSockets.get(targetUserId) ?? new Set();
                        for (const socketId of sockets) {
                            io.to(socketId).emit('message', message, (ack: unknown) => {
                                if (!ack) logger.warn({ userId: targetUserId, messageId: message.id }, 'DM not ACKed');
                            });
                        }
                    }
                }

                await refreshPresenceTTL(authorId);

                if (callback) callback({ status: 'ok', messageId: message.id });
            } catch (error) {
                logger.error({ ...msgCtx, err: error }, 'send-message failed');
                socketError('INTERNAL_ERROR', 'Error intern en enviar el missatge.');
            }
        });

        // ── Call signaling ───────────────────────────────────────────────────
        registerCallHandler(io, socket, userToSockets);

        // ── Channel voice (SFU) ──────────────────────────────────────────────
        registerChannelCallHandler(io, socket);

        socket.on('typing', (data: { channelId?: string; recipientId?: string }) => {
            const userId = socket.data.userId as string;
            if (data.channelId) {
                socket.to(`channel:${data.channelId}`).emit('typing', { userId, channelId: data.channelId });
            } else if (data.recipientId) {
                const recipientSockets = userToSockets.get(data.recipientId) ?? new Set();
                for (const socketId of recipientSockets) {
                    io.to(socketId).emit('typing', { userId, recipientId: data.recipientId });
                }
            }
        });

        socket.on('stop-typing', (data: { channelId?: string; recipientId?: string }) => {
            const userId = socket.data.userId as string;
            if (data.channelId) {
                socket.to(`channel:${data.channelId}`).emit('stop-typing', { userId, channelId: data.channelId });
            } else if (data.recipientId) {
                const recipientSockets = userToSockets.get(data.recipientId) ?? new Set();
                for (const socketId of recipientSockets) {
                    io.to(socketId).emit('stop-typing', { userId, recipientId: data.recipientId });
                }
            }
        });

        socket.on('disconnect', async () => {
            socketRateLimitsLocal.delete(socket.id);
            if (redisClient.isOpen) redisClient.del(`rl:${socket.id}`).catch(() => {});
            const userId = socketToUser.get(socket.id);
            if (userId) {
                socketToUser.delete(socket.id);
                removeUserSocket(userId, socket.id);
                await setPresence(userId, 'offline');
                socket.broadcast.emit('presence-update', { userId, status: 'offline' });
            }
        });

        socket.on('disconnecting', async () => {
            const uid = socket.data.userId as string | undefined;
            if (!uid) return;
            const remaining = userToSockets.get(uid);
            if (remaining && remaining.size <= 1) {
                // Last socket for this user — end any active call
                const { callService } = await import('../services/callService');
                const call = await callService.getByUserId(uid);
                if (call && call.state !== 'ended') {
                    await callService.end(call.id);
                    const otherId = callService.otherParticipant(call, uid);
                    const otherSockets = userToSockets.get(otherId) ?? new Set();
                    for (const sid of otherSockets) {
                        io.to(sid).emit('call:ended', { callId: call.id, reason: 'disconnected' });
                    }
                }
            }
        });
    });
};
