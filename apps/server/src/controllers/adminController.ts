import { Response } from 'express';
import { adminService } from '../services/adminService';
import { AuthRequest } from '../middleware/requireAuth';
import logger from '../utils/logger';

export const adminController = {
    async getUsers(_req: AuthRequest, res: Response) {
        try {
            const users = await adminService.getAllUsers();
            res.json(users);
        } catch (error) {
            logger.error({ err: error }, 'admin.getUsers error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async setStatus(req: AuthRequest, res: Response) {
        const id = req.params.id as string;
        const { status } = req.body;
        try {
            await adminService.setUserStatus(id, status);
            res.json({ ok: true, id, status });
        } catch (error: any) {
            // Validation errors (invalid status value) are safe to surface
            if (error.message?.startsWith('Invalid')) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, 'admin.setStatus error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async setTier(req: AuthRequest, res: Response) {
        const id = req.params.id as string;
        const { tier } = req.body;
        try {
            await adminService.setUserTier(id, tier);
            res.json({ ok: true, id, tier });
        } catch (error: any) {
            if (error.message?.startsWith('Invalid')) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, 'admin.setTier error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async setAdmin(req: AuthRequest, res: Response) {
        const id = req.params.id as string;
        const { isAdmin } = req.body;
        if (typeof isAdmin !== 'boolean') {
            return res.status(400).json({ error: 'isAdmin must be a boolean' });
        }
        try {
            await adminService.setUserAdmin(id, isAdmin);
            res.json({ ok: true, id, isAdmin });
        } catch (error) {
            logger.error({ err: error }, 'admin.setAdmin error');
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async deleteUser(req: AuthRequest, res: Response) {
        const id = req.params.id as string;
        try {
            await adminService.deleteUser(id);
            res.json({ ok: true, id });
        } catch (error) {
            logger.error({ err: error }, 'admin.deleteUser error');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
