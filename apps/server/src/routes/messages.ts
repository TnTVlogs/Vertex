import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { requireAuth } from '../middleware/requireAuth';
import { requireActive } from '../middleware/requireActive';
import { checkMessageLimits } from '../middleware/checkMessageLimits';

const router = Router();

// GET messages doesn't need tier limits, just auth
router.get('/:targetId', requireAuth, requireActive as any, messageController.getMessages);

// POST (usat només via WebSocket, no tenim ruta HTTP)

export default router;
