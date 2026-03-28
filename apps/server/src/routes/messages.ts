import { Router } from 'express';
import { messageController } from '../controllers/messageController';

const router = Router();

router.get('/:targetId', messageController.getMessages);

export default router;
