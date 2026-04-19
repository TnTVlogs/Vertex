import { Router } from 'express';
import { serverController } from '../controllers/serverController';
import { serverSettingsController } from '../controllers/serverSettingsController';
import { requireAuth } from '../middleware/requireAuth';
import { requireServerOwner } from '../middleware/requireServerOwner';
import { validateBody } from '../middleware/validate';
import {
    createChannelSchema,
    createServerSchema,
    joinServerSchema,
    transferOwnershipSchema,
    updateChannelSchema,
} from '../middleware/schemas';

const router = Router();

// Public/Member Routes
router.post('/create', requireAuth, validateBody(createServerSchema), serverController.createServer);
router.get('/user/:userId', requireAuth, serverController.getUserServers);
router.get('/:serverId/channels', requireAuth, serverController.getServerChannels);
router.get('/:serverId/members', requireAuth, serverController.getServerMembers);

// Public Preview Route
router.get('/invite/:code', serverController.getInvitePreview);

router.post('/join', requireAuth, validateBody(joinServerSchema), serverController.joinServer);

// Management Routes (Owner only)
router.post('/:id/channels', requireAuth, requireServerOwner, validateBody(createChannelSchema), serverSettingsController.createChannel);
router.put('/:id/channels/:channelId', requireAuth, requireServerOwner, validateBody(updateChannelSchema), serverSettingsController.updateChannel);
router.delete('/:id/channels/:channelId', requireAuth, requireServerOwner, serverSettingsController.deleteChannel);

router.post('/:id/invite', requireAuth, requireServerOwner, serverSettingsController.generateInvite);
router.delete('/:id/invite', requireAuth, requireServerOwner, serverSettingsController.revokeInvite);

router.delete('/:id/members/:userId', requireAuth, requireServerOwner, serverSettingsController.kickMember);
router.put('/:id/transfer', requireAuth, requireServerOwner, validateBody(transferOwnershipSchema), serverSettingsController.transferOwnership);

router.delete('/:id', requireAuth, requireServerOwner, serverSettingsController.deleteServer);

export default router;
