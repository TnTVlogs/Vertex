import { Request, Response } from 'express';
import { serverService } from '../services/serverService';
import { AuthRequest } from '../middleware/requireAuth';
import logger from '../utils/logger';

export const serverController = {
    async createServer(req: AuthRequest, res: Response) {
        const { name } = req.body;
        const ownerId = req.user!.userId;
        try {
            const server = await serverService.createServer(name, ownerId);
            res.json(server);
        } catch (error: any) {
            if (error.message?.includes('Server limit reached')) {
                return res.status(403).json({ error: error.message });
            }
            logger.error({ err: error }, 'createServer error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getUserServers(req: Request, res: Response) {
        const userId = req.params.userId as string;
        try {
            const servers = await serverService.getServersForUser(userId);
            res.json(servers);
        } catch (error) {
            logger.error({ err: error }, 'getUserServers error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getServerChannels(req: Request, res: Response) {
        const serverId = req.params.serverId as string;
        try {
            const channels = await serverService.getChannelsForServer(serverId);
            res.json(channels);
        } catch (error) {
            logger.error({ err: error }, 'getServerChannels error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async getServerMembers(req: Request, res: Response) {
        const serverId = req.params.serverId as string;
        try {
            const members = await serverService.getMembersForServer(serverId);
            res.json(members);
        } catch (error) {
            logger.error({ err: error }, 'getServerMembers error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async joinServer(req: Request, res: Response) {
        const { inviteCode, userId } = req.body;
        try {
            await serverService.joinServerByCode(inviteCode, userId);
            res.json({ message: 'Successfully joined the server' });
        } catch (error: any) {
            // Business-logic errors (invalid code, already member) are safe to surface
            res.status(400).json({ error: error.message });
        }
    },

    async getInvitePreview(req: Request, res: Response) {
        const code = req.params.code as string;
        try {
            const preview = await serverService.getPreviewByInviteCode(code);
            res.json(preview);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    }
};
