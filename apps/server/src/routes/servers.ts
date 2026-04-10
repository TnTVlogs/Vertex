import { Router } from 'express';
import { serverController } from '../controllers/serverController';
import { serverSettingsController } from '../controllers/serverSettingsController';
import { requireAuth } from '../middleware/requireAuth';
import { requireServerOwner } from '../middleware/requireServerOwner';

const router = Router();

// Public/Member Routes
router.post('/create', requireAuth, serverController.createServer);
router.get('/user/:userId', requireAuth, serverController.getUserServers);
router.get('/:serverId/channels', requireAuth, serverController.getServerChannels);

// Management Routes (Owner only)
router.post('/:id/channels', requireAuth, requireServerOwner, serverSettingsController.createChannel);
router.put('/:id/channels/:channelId', requireAuth, requireServerOwner, serverSettingsController.updateChannel);
router.delete('/:id/channels/:channelId', requireAuth, requireServerOwner, serverSettingsController.deleteChannel);

router.post('/:id/invite', requireAuth, requireServerOwner, serverSettingsController.generateInvite);
router.delete('/:id/invite', requireAuth, requireServerOwner, serverSettingsController.revokeInvite);

router.delete('/:id/members/:userId', requireAuth, requireServerOwner, serverSettingsController.kickMember);
router.put('/:id/transfer', requireAuth, requireServerOwner, serverSettingsController.transferOwnership);

router.delete('/:id', requireAuth, requireServerOwner, serverSettingsController.deleteServer);

export default router;
