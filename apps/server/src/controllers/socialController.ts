import { Request, Response } from 'express';
import { socialService } from '../services/socialService';
import logger from '../utils/logger';

export const socialController = {
    async sendFriendRequest(req: Request, res: Response) {
        const { fromId, toUsername } = req.body;
        try {
            const toUserId = await socialService.getUserIdByUsername(toUsername);

            if (!toUserId) return res.status(404).json({ error: 'User not found' });
            if (toUserId === fromId) return res.status(400).json({ error: 'You cannot add yourself' });

            const alreadyFriends = await socialService.areFriends(fromId, toUserId);
            if (alreadyFriends) return res.status(400).json({ error: 'You are already friends' });

            const requestExists = await socialService.requestExists(fromId, toUserId);
            if (requestExists) return res.status(400).json({ error: 'A friend request already exists between you' });

            const id = await socialService.createFriendRequest(fromId, toUserId);
            const fromUsername = await socialService.getUsernameById(fromId);

            const io = req.app.get('io');
            if (io) {
                io.to(`user:${toUserId}`).emit('friend-request', {
                    id,
                    from_id: fromId,
                    to_id: toUserId,
                    from_username: fromUsername,
                    status: 'pending'
                });
            }

            res.json({ message: 'Friend request sent' });
        } catch (error) {
            logger.error({ err: error }, 'sendFriendRequest error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getRequests(req: Request, res: Response) {
        const userId = req.params.userId as string;
        try {
            const requests = await socialService.getFriendRequests(userId);
            res.json(requests);
        } catch (error) {
            logger.error({ err: error }, 'getRequests error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async respondToRequest(req: Request, res: Response) {
        const { requestId, status } = req.body;
        try {
            const request = await socialService.getRequestById(requestId);

            if (!request) return res.status(404).json({ error: 'Request not found' });

            await socialService.deleteRequest(requestId);

            if (status === 'accepted') {
                await socialService.createFriendship(request.fromId, request.toId);
            }

            const io = req.app.get('io');
            if (io) {
                io.to(`user:${request.fromId}`).emit('friend-response', {
                    requestId,
                    status,
                    to_id: request.toId
                });
            }

            res.json({ message: `Request ${status}` });
        } catch (error) {
            logger.error({ err: error }, 'respondToRequest error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getFriends(req: Request, res: Response) {
        const userId = req.params.userId as string;
        try {
            const friends = await socialService.getFriends(userId);
            res.json(friends);
        } catch (error) {
            logger.error({ err: error }, 'getFriends error');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
