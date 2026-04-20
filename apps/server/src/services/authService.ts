import { v4 as uuidv4 } from 'uuid';
import prisma from './prisma';

export const authService = {
    async createUser(
        username: string,
        email: string,
        passwordHash: string,
        registrationIp?: string
    ) {
        return prisma.user.create({
            data: {
                id: uuidv4(),
                username,
                email,
                passwordHash,
                status: 'PENDING',
                tier: 'BASIC',
                registrationIp: registrationIp ?? null,
            },
            select: { id: true, username: true, email: true },
        });
    },

    async countUsersByIp(ip: string): Promise<number> {
        return prisma.user.count({ where: { registrationIp: ip } });
    },

    async getUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                username: true,
                email: true,
                passwordHash: true,
                status: true,
                tier: true,
                avatarUrl: true,
                isAdmin: true,
            },
        });
    },

    async getUserById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                status: true,
                tier: true,
                isAdmin: true,
                avatarUrl: true,
            },
        });
    },
};
