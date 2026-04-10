import { Response, NextFunction } from 'express';
import { AuthRequest } from './requireAuth';
import prisma from '../services/prisma';

export const requireServerOwner = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id: serverId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const server = await prisma.server.findUnique({
            where: { id: serverId },
            select: { ownerId: true }
        });

        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        if (server.ownerId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You are not the owner of this server' });
        }

        next();
    } catch (error) {
        console.error('requireServerOwner Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
