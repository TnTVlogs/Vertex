import { Response, NextFunction } from 'express';
import { AuthRequest } from './requireAuth';
import { authService } from '../services/authService';

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user.userId;

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
