import prisma from './prisma';
import { UserStatus, UserTier } from '@prisma/client';

const VALID_STATUSES = ['PENDING', 'ACTIVE', 'BANNED'] as const;
const VALID_TIERS = ['BASIC', 'PRO', 'VIP'] as const;

export const adminService = {
    async getAllUsers() {
        return prisma.user.findMany({
            orderBy: { username: 'asc' },
            select: {
                id: true,
                username: true,
                email: true,
                status: true,
                tier: true,
                isAdmin: true,
                registrationIp: true,
                avatarUrl: true,
            },
        });
    },

    async setUserStatus(userId: string, status: string): Promise<void> {
        if (!(VALID_STATUSES as readonly string[]).includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }
        await prisma.user.update({ where: { id: userId }, data: { status: status as UserStatus } });
    },

    async setUserTier(userId: string, tier: string): Promise<void> {
        if (!(VALID_TIERS as readonly string[]).includes(tier)) {
            throw new Error(`Invalid tier: ${tier}`);
        }
        await prisma.user.update({ where: { id: userId }, data: { tier: tier as UserTier } });
    },

    async setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
        await prisma.user.update({ where: { id: userId }, data: { isAdmin } });
    },

    async deleteUser(userId: string): Promise<void> {
        // ON DELETE CASCADE handles messages and memberships automatically
        await prisma.user.delete({ where: { id: userId } });
    },
};
