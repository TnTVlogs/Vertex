import { Router } from 'express';
import { serverController } from '../controllers/serverController';
import { serverSettingsController } from '../controllers/serverSettingsController';
import { requireAuth } from '../middleware/requireAuth';
import { requireActive } from '../middleware/requireActive';
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

// Public Preview Route (no auth)
router.get('/invite/:code', serverController.getInvitePreview);

// All remaining routes require auth + active account
router.post('/create', requireAuth, requireActive as any, validateBody(createServerSchema), serverController.createServer);
router.get('/user/:userId', requireAuth, requireActive as any, serverController.getUserServers);
router.get('/:serverId/channels', requireAuth, requireActive as any, serverController.getServerChannels);
router.get('/:serverId/members', requireAuth, requireActive as any, serverController.getServerMembers);
router.post('/join', requireAuth, requireActive as any, validateBody(joinServerSchema), serverController.joinServer);

// Management Routes (Owner only)
router.post('/:id/channels', requireAuth, requireActive as any, requireServerOwner, validateBody(createChannelSchema), serverSettingsController.createChannel);
router.put('/:id/channels/:channelId', requireAuth, requireActive as any, requireServerOwner, validateBody(updateChannelSchema), serverSettingsController.updateChannel);
router.delete('/:id/channels/:channelId', requireAuth, requireActive as any, requireServerOwner, serverSettingsController.deleteChannel);

router.post('/:id/invite', requireAuth, requireActive as any, requireServerOwner, serverSettingsController.generateInvite);
router.delete('/:id/invite', requireAuth, requireActive as any, requireServerOwner, serverSettingsController.revokeInvite);

router.delete('/:id/members/:userId', requireAuth, requireActive as any, requireServerOwner, serverSettingsController.kickMember);
router.put('/:id/members/:userId/mute', requireAuth, requireActive as any, requireServerOwner, serverSettingsController.muteMember);
router.delete('/:id/members/:userId/mute', requireAuth, requireActive as any, requireServerOwner, serverSettingsController.unmuteMember);
router.put('/:id/members/:userId/ban', requireAuth, requireActive as any, requireServerOwner, serverSettingsController.banMember);
router.delete('/:id/members/:userId/ban', requireAuth, requireActive as any, requireServerOwner, serverSettingsController.unbanMember);
router.put('/:id/transfer', requireAuth, requireActive as any, requireServerOwner, validateBody(transferOwnershipSchema), serverSettingsController.transferOwnership);

router.delete('/:id', requireAuth, requireActive as any, requireServerOwner, serverSettingsController.deleteServer);

export default router;
