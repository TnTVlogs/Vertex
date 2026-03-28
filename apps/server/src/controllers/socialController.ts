import { Request, Response } from 'express';
import { socialService } from '../services/socialService';

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

            // Emit real-time notification
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
        } catch (error: any) {
            console.error('sendFriendRequest error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getRequests(req: Request, res: Response) {
        const { userId } = req.params;
        try {
            const requests = await socialService.getFriendRequests(userId);
            res.json(requests);
        } catch (error: any) {
            console.error('getRequests error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async respondToRequest(req: Request, res: Response) {
        const { requestId, status } = req.body; // 'accepted' or 'declined'
        try {
            const request = await socialService.getRequestById(requestId);

            if (!request) return res.status(404).json({ error: 'Request not found' });

            // Delete the request from DB as requested
            await socialService.deleteRequest(requestId);

            if (status === 'accepted') {
                await socialService.createFriendship(request.from_id, request.to_id);
            }

            // Notify the original sender
            const io = req.app.get('io');
            if (io) {
                io.to(`user:${request.from_id}`).emit('friend-response', {
                    requestId,
                    status,
                    to_id: request.to_id
                });
            }

            res.json({ message: `Request ${status}` });
        } catch (error: any) {
            console.error('respondToRequest error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getFriends(req: Request, res: Response) {
        const { userId } = req.params;
        try {
            const friends = await socialService.getFriends(userId);
            res.json(friends);
        } catch (error: any) {
            console.error('getFriends error:', error);
            res.status(500).json({ error: error.message });
        }
    }
};
