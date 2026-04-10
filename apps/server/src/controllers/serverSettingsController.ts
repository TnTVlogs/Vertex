import { Request, Response } from 'express';
import { serverSettingsService } from '../services/serverSettingsService';

export const serverSettingsController = {
    async createChannel(req: Request, res: Response) {
        const { id: serverId } = req.params;
        const { name, type } = req.body;
        try {
            const channel = await serverSettingsService.createChannel(serverId, name, type);
            res.status(201).json(channel);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async updateChannel(req: Request, res: Response) {
        const { channelId } = req.params;
        const { name } = req.body;
        try {
            const channel = await serverSettingsService.updateChannel(channelId, name);
            res.json(channel);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async deleteChannel(req: Request, res: Response) {
        const { channelId } = req.params;
        try {
            await serverSettingsService.deleteChannel(channelId);
            res.json({ message: 'Channel deleted' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async generateInvite(req: Request, res: Response) {
        const { id: serverId } = req.params;
        try {
            const server = await serverSettingsService.generateInvite(serverId);
            res.json({ inviteCode: server.inviteCode });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async revokeInvite(req: Request, res: Response) {
        const { id: serverId } = req.params;
        try {
            await serverSettingsService.revokeInvite(serverId);
            res.json({ message: 'Invite revoked' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async kickMember(req: Request, res: Response) {
        const { id: serverId, userId } = req.params;
        try {
            await serverSettingsService.kickMember(serverId, userId);
            res.json({ message: 'Member kicked' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async transferOwnership(req: Request, res: Response) {
        const { id: serverId } = req.params;
        const { newOwnerId } = req.body;
        try {
            await serverSettingsService.transferOwnership(serverId, newOwnerId);
            res.json({ message: 'Ownership transferred' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    async deleteServer(req: Request, res: Response) {
        const { id: serverId } = req.params;
        try {
            await serverSettingsService.deleteServer(serverId);
            res.json({ message: 'Server deleted completely' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
};
