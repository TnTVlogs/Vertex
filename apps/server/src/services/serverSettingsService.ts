import prisma from './prisma';
import { ChannelType } from '@prisma/client';
import { invalidateMembersCache, invalidateServersCache } from './serverService';

export const serverSettingsService = {
    async createChannel(serverId: string, name: string, type: ChannelType = ChannelType.text) {
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

    async generateInvite(serverId: string, expiresInDays: number | null = 7) {
        // Generate a 5-character alphanumeric lowercase code (a-z0-9)
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let inviteCode = '';
        for (let i = 0; i < 5; i++) {
            inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const inviteExpiresAt = expiresInDays !== null
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;

        return prisma.server.update({
            where: { id: serverId },
            data: { inviteCode, inviteExpiresAt }
        });
    },

    async revokeInvite(serverId: string) {
        return prisma.server.update({
            where: { id: serverId },
            data: { inviteCode: null, inviteExpiresAt: null }
        });
    },

    async kickMember(serverId: string, userId: string) {
        const result = await prisma.member.delete({
            where: { serverId_userId: { serverId, userId } }
        });
        invalidateMembersCache(serverId);
        invalidateServersCache(userId);
        return result;
    },

    async transferOwnership(serverId: string, newOwnerId: string) {
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
        }).then((result) => {
            invalidateMembersCache(serverId);
            return result;
        });
    },

    async deleteServer(serverId: string) {
        // Cascade delete for channels and messages is defined in schema.prisma,
        // so deleting the server will clean up everything.
        return prisma.server.delete({
            where: { id: serverId }
        });
    },

    async muteMember(serverId: string, userId: string, mutedUntil?: Date | null) {
        const result = await prisma.member.update({
            where: { serverId_userId: { serverId, userId } },
            data: { isMuted: true, mutedUntil: mutedUntil ?? null },
        });
        invalidateMembersCache(serverId);
        return result;
    },

    async unmuteMember(serverId: string, userId: string) {
        const result = await prisma.member.update({
            where: { serverId_userId: { serverId, userId } },
            data: { isMuted: false, mutedUntil: null },
        });
        invalidateMembersCache(serverId);
        return result;
    },

    async banMember(serverId: string, userId: string) {
        const result = await prisma.member.update({
            where: { serverId_userId: { serverId, userId } },
            data: { isBanned: true },
        });
        invalidateMembersCache(serverId);
        return result;
    },

    async unbanMember(serverId: string, userId: string) {
        const result = await prisma.member.update({
            where: { serverId_userId: { serverId, userId } },
            data: { isBanned: false },
        });
        invalidateMembersCache(serverId);
        return result;
    },

    async getMemberStatus(serverId: string, userId: string) {
        return prisma.member.findUnique({
            where: { serverId_userId: { serverId, userId } },
            select: { isMuted: true, mutedUntil: true, isBanned: true },
        });
    },
};
