import prisma from './prisma';

export const serverService = {
    async createServer(name: string, ownerId: string) {
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
        const server = await prisma.server.findUnique({
            where: { inviteCode }
        });

        if (!server) {
            throw new Error('Invalid invite code');
        }

        if (server.inviteExpiresAt && server.inviteExpiresAt < new Date()) {
            throw new Error('This invite link has expired');
        }

        // Check if already a member
        const existingMember = await prisma.member.findUnique({
            where: {
                serverId_userId: {
                    serverId: server.id,
                    userId
                }
            }
        });

        if (existingMember) {
            throw new Error('You are already a member of this server');
        }

        return prisma.member.create({
            data: {
                serverId: server.id,
                userId,
                role: 'member'
            }
        });
    },

    async getPreviewByInviteCode(inviteCode: string) {
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

        return {
            name: server.name,
            ownerUsername: server.owner?.username,
            memberCount: server._count.members,
            expiresAt: server.inviteExpiresAt?.toISOString() ?? null
        };
    }
};
