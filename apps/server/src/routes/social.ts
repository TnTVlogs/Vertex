import { Router } from 'express';
import { socialController } from '../controllers/socialController';

const router = Router();

router.post('/request', socialController.sendFriendRequest);
router.get('/requests/:userId', socialController.getRequests);
router.post('/request/respond', socialController.respondToRequest);
router.get('/friends/:userId', socialController.getFriends);

export default router;
