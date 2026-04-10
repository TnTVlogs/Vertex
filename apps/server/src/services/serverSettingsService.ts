import prisma from './prisma';
import { v4 as uuidv4 } from 'uuid';

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
        const inviteCode = uuidv4().slice(0, 8); // Short 8-char code
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
        return prisma.$transaction([
            prisma.server.update({
                where: { id: serverId },
                data: { ownerId: newOwnerId }
            }),
            prisma.member.update({
                where: {
                    serverId_userId: {
                        serverId,
                        userId: newOwnerId
                    }
                },
                data: { role: 'owner' }
            })
            // Option: current owner becomes regular member or keeps some role
        ]);
    },

    async deleteServer(serverId: string) {
        // Cascade delete is handled by the database/Prisma schema rules we added
        return prisma.server.delete({
            where: { id: serverId }
        });
    }
};
