import { Response, NextFunction } from 'express';
import { AuthRequest } from './requireAuth';
import { authService } from '../services/authService';

// Admin check: DB isAdmin flag (primary) OR ADMIN_USER_ID env var (bootstrap fallback).
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Bootstrap fallback: if ADMIN_USER_ID is set and matches, allow
    const envAdminId = process.env.ADMIN_USER_ID;
    if (envAdminId && userId === envAdminId) {
        return next();
    }

    // Primary: DB isAdmin flag
    try {
        const user = await authService.getUserById(userId);
        if (user?.isAdmin) {
            return next();
        }
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    } catch (e) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
