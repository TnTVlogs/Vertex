import { Request, Response } from 'express';
import { serverSettingsService } from '../services/serverSettingsService';
import logger from '../utils/logger';

export const serverSettingsController = {
    async createChannel(req: Request, res: Response) {
        const serverId = req.params.id as string;
        const { name, type } = req.body;
        try {
            const channel = await serverSettingsService.createChannel(serverId, name, type);
            res.status(201).json(channel);
        } catch (error) {
            logger.error({ err: error }, 'createChannel error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async updateChannel(req: Request, res: Response) {
        const channelId = req.params.channelId as string;
        const { name } = req.body;
        try {
            const channel = await serverSettingsService.updateChannel(channelId, name);
            res.json(channel);
        } catch (error) {
            logger.error({ err: error }, 'updateChannel error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async deleteChannel(req: Request, res: Response) {
        const channelId = req.params.channelId as string;
        try {
            await serverSettingsService.deleteChannel(channelId);
            res.json({ message: 'Channel deleted' });
        } catch (error) {
            logger.error({ err: error }, 'deleteChannel error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async generateInvite(req: Request, res: Response) {
        const serverId = req.params.id as string;
        // expiresInDays: number = expire in N days, null = never expires, omitted = 7 days
        const expiresInDays = req.body.expiresInDays !== undefined ? req.body.expiresInDays : 7;
        try {
            const server = await serverSettingsService.generateInvite(serverId, expiresInDays);
            res.json({
                inviteCode: (server as any).inviteCode,
                inviteExpiresAt: (server as any).inviteExpiresAt ?? null
            });
        } catch (error) {
            logger.error({ err: error }, 'generateInvite error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async revokeInvite(req: Request, res: Response) {
        const serverId = req.params.id as string;
        try {
            await serverSettingsService.revokeInvite(serverId);
            res.json({ message: 'Invite revoked' });
        } catch (error) {
            logger.error({ err: error }, 'revokeInvite error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async kickMember(req: Request, res: Response) {
        const serverId = req.params.id as string;
        const userId = req.params.userId as string;
        try {
            await serverSettingsService.kickMember(serverId, userId);
            res.json({ message: 'Member kicked' });
        } catch (error) {
            logger.error({ err: error }, 'kickMember error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async transferOwnership(req: Request, res: Response) {
        const serverId = req.params.id as string;
        const { newOwnerId } = req.body;
        try {
            await serverSettingsService.transferOwnership(serverId, newOwnerId);
            res.json({ message: 'Ownership transferred' });
        } catch (error) {
            logger.error({ err: error }, 'transferOwnership error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async deleteServer(req: Request, res: Response) {
        const serverId = req.params.id as string;
        try {
            await serverSettingsService.deleteServer(serverId);
            res.json({ message: 'Server deleted completely' });
        } catch (error) {
            logger.error({ err: error }, 'deleteServer error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async muteMember(req: Request, res: Response) {
        const serverId = req.params.id as string;
        const userId = req.params.userId as string;
        const { mutedUntil } = req.body;
        try {
            await serverSettingsService.muteMember(serverId, userId, mutedUntil ? new Date(mutedUntil) : null);
            res.json({ message: 'Member muted' });
        } catch (error) {
            logger.error({ err: error }, 'muteMember error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async unmuteMember(req: Request, res: Response) {
        const serverId = req.params.id as string;
        const userId = req.params.userId as string;
        try {
            await serverSettingsService.unmuteMember(serverId, userId);
            res.json({ message: 'Member unmuted' });
        } catch (error) {
            logger.error({ err: error }, 'unmuteMember error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async banMember(req: Request, res: Response) {
        const serverId = req.params.id as string;
        const userId = req.params.userId as string;
        try {
            await serverSettingsService.banMember(serverId, userId);
            res.json({ message: 'Member banned' });
        } catch (error) {
            logger.error({ err: error }, 'banMember error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async unbanMember(req: Request, res: Response) {
        const serverId = req.params.id as string;
        const userId = req.params.userId as string;
        try {
            await serverSettingsService.unbanMember(serverId, userId);
            res.json({ message: 'Member unbanned' });
        } catch (error) {
            logger.error({ err: error }, 'unbanMember error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },
};
