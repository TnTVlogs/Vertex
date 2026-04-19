import prisma from './prisma';
import redisClient from './redisService';
import { Tier } from '../config/limits.config';
import { getLimits } from './tierService';

const PREVIEW_CACHE_TTL = 300; // 5 minutes

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
        });
    },

    async getServersForUser(userId: string) {
        // Only fetch servers + channels. Members are fetched on demand via getMembersForServer.
        return prisma.server.findMany({
            where: {
                members: {
                    some: { userId }
                }
            },
            include: {
                channels: true,
            }
        });
    },

    async getMembersForServer(serverId: string) {
        return prisma.member.findMany({
            where: { serverId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        status: true,
                    }
                }
            }
        });
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
