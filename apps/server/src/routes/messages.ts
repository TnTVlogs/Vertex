import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { requireAuth } from '../middleware/requireAuth';
import { requireActive } from '../middleware/requireActive';
import { checkMessageLimits } from '../middleware/checkMessageLimits';

const router = Router();

// Must be before /:targetId to avoid being captured as a targetId param
router.get('/search', requireAuth, messageController.searchMessages);

// GET messages doesn't need tier limits, just auth
router.get('/:targetId', requireAuth, requireActive as any, messageController.getMessages);

// DELETE soft-delete (author or admin)
router.delete('/:messageId', requireAuth, requireActive as any, messageController.deleteMessage as any);

export default router;
