import prisma from './prisma';
import redisClient from './redisService';
import { Tier } from '../config/limits.config';
import { getLimits } from './tierService';

const PREVIEW_CACHE_TTL = 300;
const MEMBERS_CACHE_TTL = 120;  // 2 min
const SERVERS_CACHE_TTL = 120;  // 2 min

export function invalidateMembersCache(serverId: string) {
    if (redisClient.isOpen) redisClient.del(`members:${serverId}`).catch(() => {});
}
export function invalidateServersCache(userId: string) {
    if (redisClient.isOpen) redisClient.del(`servers:${userId}`).catch(() => {});
}

export const serverService = {
    async createServer(name: string, ownerId: string) {
        // Enforce per-tier server limit before creating
        const owner = await prisma.user.findUnique({
            where: { id: ownerId },
            select: { tier: true },
        });
        const tier = (owner?.tier as Tier) ?? 'BASIC';
        const limits = await getLimits(tier);
        const count = await prisma.server.count({ where: { ownerId } });
        if (count >= limits.maxServersPerUser) {
            throw new Error(`Server limit reached. Your ${tier} tier allows up to ${limits.maxServersPerUser} server(s).`);
        }

        // We do this in a transaction to ensure all core bits are created
        return prisma.$transaction(async (tx) => {
            const server = await tx.server.create({
                data: {
                    name,
                    ownerId,
                    members: {
                        create: {
                            userId: ownerId,
                            role: 'owner'
                        }
                    },
                    channels: {
                        create: {
                            name: 'general',
                            type: 'text'
                        }
                    }
                },
                include: {
                    channels: true
                }
            });

            return {
                id: server.id,
                name: server.name,
                generalChannelId: server.channels[0].id
            };
        }).then((result) => {
            invalidateServersCache(ownerId);
            return result;
        });
    },

    async getServersForUser(userId: string) {
        const key = `servers:${userId}`;
        if (redisClient.isOpen) {
            const cached = await redisClient.get(key);
            if (cached) return JSON.parse(cached);
        }
        const servers = await prisma.server.findMany({
            where: { members: { some: { userId } } },
            include: { channels: true },
        });
        if (redisClient.isOpen) {
            await redisClient.setEx(key, SERVERS_CACHE_TTL, JSON.stringify(servers));
        }
        return servers;
    },

    async getMembersForServer(serverId: string) {
        const key = `members:${serverId}`;
        if (redisClient.isOpen) {
            const cached = await redisClient.get(key);
            if (cached) return JSON.parse(cached);
        }
        const raw = await prisma.member.findMany({
            where: { serverId },
            include: {
                user: { select: { id: true, username: true, avatarUrl: true, status: true } },
            },
        });
        const members = raw.map((m) => ({
            id: m.id,
            userId: m.userId,
            serverId: m.serverId,
            role: m.role,
            username: m.user?.username ?? '',
            avatarUrl: m.user?.avatarUrl ?? null,
        }));
        if (redisClient.isOpen) {
            await redisClient.setEx(key, MEMBERS_CACHE_TTL, JSON.stringify(members));
        }
        return members;
    },

    async getChannelsForServer(serverId: string) {
        return prisma.channel.findMany({
            where: { serverId }
        });
    },

    async isUserMemberOfChannel(userId: string, channelId: string): Promise<boolean> {
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            select: { serverId: true }
        });
        if (!channel) return false;
        const member = await prisma.member.findUnique({
            where: { serverId_userId: { serverId: channel.serverId, userId } }
        });
        return !!member;
    },

    async isUserMemberOfServer(userId: string, serverId: string): Promise<boolean> {
        const member = await prisma.member.findUnique({
            where: { serverId_userId: { serverId, userId } }
        });
        return !!member;
    },

    async getChannelServerId(channelId: string): Promise<string | null> {
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            select: { serverId: true }
        });
        return channel?.serverId ?? null
    },

    async joinServerByCode(inviteCode: string, userId: string) {
        return prisma.$transaction(async (tx) => {
            const server = await tx.server.findUnique({
                where: { inviteCode }
            });

            if (!server) {
                throw new Error('Invalid invite code');
            }

            if (server.inviteExpiresAt && server.inviteExpiresAt < new Date()) {
                throw new Error('This invite link has expired');
            }

            const existingMember = await tx.member.findUnique({
                where: {
                    serverId_userId: {
                        serverId: server.id,
                        userId
                    }
                }
            });

            if (existingMember) {
                if (existingMember.isBanned) throw new Error('You are banned from this server');
                throw new Error('You are already a member of this server');
            }

            return tx.member.create({
                data: {
                    serverId: server.id,
                    userId,
                    role: 'member'
                }
            });
        }).then((result) => {
            invalidateMembersCache(result.serverId);
            invalidateServersCache(userId);
            return result;
        });
    },

    async getPreviewByInviteCode(inviteCode: string) {
        const cacheKey = `preview:${inviteCode}`;
        if (redisClient.isOpen) {
            const cached = await redisClient.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }

        const server = await prisma.server.findUnique({
            where: { inviteCode },
            include: {
                _count: {
                    select: { members: true }
                },
                owner: {
                    select: { username: true }
                }
            }
        });

        if (!server) {
            throw new Error('Invalid invite code');
        }

        if (server.inviteExpiresAt && server.inviteExpiresAt < new Date()) {
            throw new Error('This invite link has expired');
        }

        const preview = {
            name: server.name,
            ownerUsername: server.owner?.username,
            memberCount: server._count.members,
            expiresAt: server.inviteExpiresAt?.toISOString() ?? null
        };

        if (redisClient.isOpen) {
            await redisClient.setEx(cacheKey, PREVIEW_CACHE_TTL, JSON.stringify(preview));
        }

        return preview;
    },

    async getChannelById(channelId: string) {
        return prisma.channel.findUnique({
            where: { id: channelId },
            select: { id: true, serverId: true },
        });
    },

    async cleanupExpiredInvites() {
        return prisma.server.updateMany({
            where: {
                inviteCode: { not: null },
                inviteExpiresAt: { lt: new Date() },
            },
            data: { inviteCode: null, inviteExpiresAt: null },
        });
    },
};
