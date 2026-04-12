import prisma from './prisma';

export const serverSettingsService = {
    async createChannel(serverId: string, name: string, type: string = 'text') {
        return prisma.channel.create({
            data: {
                serverId,
                name,
                type
            }
        });
    },

    async updateChannel(channelId: string, name: string) {
        return prisma.channel.update({
            where: { id: channelId },
            data: { name }
        });
    },

    async deleteChannel(channelId: string) {
        return prisma.channel.delete({
            where: { id: channelId }
        });
    },

    async generateInvite(serverId: string) {
        // Generate a 5-character alphanumeric lowercase code (a-z0-9)
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let inviteCode = '';
        for (let i = 0; i < 5; i++) {
            inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return prisma.server.update({
            where: { id: serverId },
            data: { inviteCode }
        });
    },

    async revokeInvite(serverId: string) {
        return prisma.server.update({
            where: { id: serverId },
            data: { inviteCode: null }
        });
    },

    async kickMember(serverId: string, userId: string) {
        return prisma.member.delete({
            where: {
                serverId_userId: {
                    serverId,
                    userId
                }
            }
        });
    },

    async transferOwnership(serverId: string, newOwnerId: string) {
        // We use a transaction to swap ownerId and roles atomically
        return prisma.$transaction(async (tx) => {
            const server = await tx.server.findUnique({
                where: { id: serverId },
                select: { ownerId: true }
            });

            if (!server) throw new Error('Server not found');
            const oldOwnerId = server.ownerId;

            // 1. Update server ownerId
            await tx.server.update({
                where: { id: serverId },
                data: { ownerId: newOwnerId }
            });

            // 2. Change old owner's role to 'member'
            await tx.member.update({
                where: {
                    serverId_userId: {
                        serverId,
                        userId: oldOwnerId
                    }
                },
                data: { role: 'member' }
            });

            // 3. Change new owner's role to 'owner'
            await tx.member.update({
                where: {
                    serverId_userId: {
                        serverId,
                        userId: newOwnerId
                    }
                },
                data: { role: 'owner' }
            });

            return { message: 'Success' };
        });
    },

    async deleteServer(serverId: string) {
        // Cascade delete for channels and messages is defined in schema.prisma,
        // so deleting the server will clean up everything.
        return prisma.server.delete({
            where: { id: serverId }
        });
    }
};
