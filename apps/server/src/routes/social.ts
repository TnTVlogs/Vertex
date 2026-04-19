import { Router } from 'express';
import { socialController } from '../controllers/socialController';
import { validateBody } from '../middleware/validate';
import { respondToRequestSchema, sendFriendRequestSchema } from '../middleware/schemas';

const router = Router();

router.post('/request', validateBody(sendFriendRequestSchema), socialController.sendFriendRequest);
router.get('/requests/:userId', socialController.getRequests);
router.post('/request/respond', validateBody(respondToRequestSchema), socialController.respondToRequest);
router.get('/friends/:userId', socialController.getFriends);

export default router;
