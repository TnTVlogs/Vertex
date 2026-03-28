import { Request, Response } from 'express';
import { serverService } from '../services/serverService';

export const serverController = {
    async createServer(req: Request, res: Response) {
        const { name, ownerId } = req.body;
        try {
            const server = await serverService.createServer(name, ownerId);
            res.json(server);
        } catch (error: any) {
            console.error('createServer error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getUserServers(req: Request, res: Response) {
        const { userId } = req.params;
        try {
            const servers = await serverService.getServersForUser(userId);
            res.json(servers);
        } catch (error: any) {
            console.error('getUserServers error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getServerChannels(req: Request, res: Response) {
        const { serverId } = req.params;
        try {
            const channels = await serverService.getChannelsForServer(serverId);
            res.json(channels);
        } catch (error: any) {
            console.error('getServerChannels error:', error);
            res.status(500).json({ error: error.message });
        }
    }
};
