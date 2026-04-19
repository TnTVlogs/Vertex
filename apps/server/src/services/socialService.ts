import { v4 as uuidv4 } from 'uuid';
import prisma from './prisma';

export const socialService = {
    async getUserIdByUsername(username: string): Promise<string | null> {
        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true },
        });
        return user?.id ?? null;
    },

    async areFriends(userId1: string, userId2: string): Promise<boolean> {
        const [u1, u2] = [userId1, userId2].sort();
        const friendship = await prisma.friendship.findUnique({
            where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        });
        return friendship !== null;
    },

    async requestExists(fromId: string, toId: string): Promise<boolean> {
        const request = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { fromId, toId },
                    { fromId: toId, toId: fromId },
                ],
            },
        });
        return request !== null;
    },

    async createFriendRequest(fromId: string, toId: string): Promise<string> {
        const request = await prisma.friendRequest.create({
            data: { id: uuidv4(), fromId, toId, status: 'pending' },
            select: { id: true },
        });
        return request.id;
    },

    async getUsernameById(userId: string): Promise<string | null> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true },
        });
        return user?.username ?? null;
    },

    async getFriendRequests(userId: string) {
        const requests = await prisma.friendRequest.findMany({
            where: {
                OR: [{ fromId: userId }, { toId: userId }],
                status: 'pending',
            },
            include: {
                from: { select: { username: true } },
                to: { select: { username: true } },
            },
        });

        type RequestWithUsers = (typeof requests)[number];
        return requests.map((r: RequestWithUsers) => ({
            id: r.id,
            from_id: r.fromId,
            to_id: r.toId,
            status: r.status,
            from_username: r.from.username,
            to_username: r.to.username,
            direction: r.toId === userId ? 'incoming' : 'outgoing',
        }));
    },

    async getRequestById(requestId: string) {
        return prisma.friendRequest.findUnique({
            where: { id: requestId },
            select: { id: true, fromId: true, toId: true, status: true },
        });
    },

    async deleteRequest(requestId: string): Promise<void> {
        await prisma.friendRequest.delete({ where: { id: requestId } });
    },

    async createFriendship(userId1: string, userId2: string): Promise<void> {
        const [u1, u2] = [userId1, userId2].sort();
        // upsert to gracefully handle the rare duplicate (mirrors the old INSERT IGNORE)
        await prisma.friendship.upsert({
            where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
            create: { id: uuidv4(), user1Id: u1, user2Id: u2 },
            update: {},
        });
    },

    async getFriends(userId: string) {
        const friendships = await prisma.friendship.findMany({
            where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
            include: {
                user1: { select: { id: true, username: true, status: true, avatarUrl: true } },
                user2: { select: { id: true, username: true, status: true, avatarUrl: true } },
            },
        });

        // Return the "other" user in each friendship
        type FriendshipWithUsers = (typeof friendships)[number];
        return friendships.map((f: FriendshipWithUsers) => (f.user1Id === userId ? f.user2 : f.user1));
    },
};
