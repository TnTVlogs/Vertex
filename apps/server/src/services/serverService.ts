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
        // Fetch servers where user is a member, including detailed relations
        return prisma.server.findMany({
            where: {
                members: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                channels: true,
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatarUrl: true,
                                status: true
                            }
                        }
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

    async joinServerByCode(inviteCode: string, userId: string) {
        const server = await prisma.server.findUnique({
            where: { inviteCode }
        });

        if (!server) {
            throw new Error('Invalid invite code');
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

        return {
            name: server.name,
            ownerUsername: server.owner?.username,
            memberCount: server._count.members
        };
    }
};
