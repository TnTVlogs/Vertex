import { v4 as uuidv4 } from 'uuid';
import prisma from './prisma';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const authorSelect = {
    id: true,
    username: true,
    avatarUrl: true,
} as const;

export const messageService = {
    async getChannelMessages(channelId: string, limit = DEFAULT_LIMIT, before?: Date) {
        const safeLimit = Math.min(limit, MAX_LIMIT);
        const rows = await prisma.message.findMany({
            where: {
                channelId,
                ...(before ? { createdAt: { lt: before } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: safeLimit,
            include: { author: { select: authorSelect } },
        });
        // Reverse so oldest appears first (chronological order for the client)
        return rows.reverse();
    },

    async getDirectMessages(userId1: string, userId2: string, limit = DEFAULT_LIMIT, before?: Date) {
        const safeLimit = Math.min(limit, MAX_LIMIT);
        const rows = await prisma.message.findMany({
            where: {
                OR: [
                    { authorId: userId1, recipientId: userId2 },
                    { authorId: userId2, recipientId: userId1 },
                ],
                ...(before ? { createdAt: { lt: before } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: safeLimit,
            include: { author: { select: authorSelect } },
        });
        return rows.reverse();
    },

    async countTodayMessages(authorId: string): Promise<number> {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        return prisma.message.count({
            where: { authorId, createdAt: { gte: startOfToday } },
        });
    },

    /** Fetch the status and tier of a user — used by the socket handler for validation. */
    async getUserTierInfo(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: { status: true, tier: true },
        });
    },

    /**
     * Persist a new message and return the full object (with author info) ready to broadcast.
     */
    async createMessage(data: {
        authorId: string;
        content: string;
        channelId?: string | null;
        recipientId?: string | null;
        attachmentUrl?: string | null;
    }) {
        if (!data.channelId && !data.recipientId) {
            throw new Error('Message must have either a channel or a recipient');
        }
        return prisma.message.create({
            data: {
                id: uuidv4(),
                content: data.content,
                authorId: data.authorId,
                channelId: data.channelId ?? null,
                recipientId: data.recipientId ?? null,
                attachmentUrl: data.attachmentUrl ?? null,
            },
            include: { author: { select: authorSelect } },
        });
    },

    // Prisma already returns camelCase fields, so this is now a simple pass-through
    // kept for compatibility with messageController which calls rows.map(formatMessage)
    formatMessage(row: {
        id: string;
        content: string;
        attachmentUrl: string | null;
        authorId: string;
        channelId: string | null;
        recipientId: string | null;
        createdAt: Date;
        author: { id: string; username: string; avatarUrl: string | null } | null;
    }) {
        return {
            id: row.id,
            content: row.content,
            attachmentUrl: row.attachmentUrl,
            authorId: row.authorId,
            channelId: row.channelId,
            recipientId: row.recipientId,
            createdAt: row.createdAt,
            author: row.author,
        };
    },
};
