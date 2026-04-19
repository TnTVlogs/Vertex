import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// All admin routes require authentication AND admin privileges
router.use(requireAuth, requireAdmin as any);

router.get('/users', adminController.getUsers as any);
router.put('/users/:id/status', adminController.setStatus as any);
router.put('/users/:id/tier', adminController.setTier as any);
router.put('/users/:id/admin', adminController.setAdmin as any);
router.delete('/users/:id', adminController.deleteUser as any);

export default router;
