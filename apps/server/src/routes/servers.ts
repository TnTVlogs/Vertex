import { Router } from 'express';
import { serverController } from '../controllers/serverController';

const router = Router();

router.post('/create', serverController.createServer);
router.get('/user/:userId', serverController.getUserServers);
router.get('/:serverId/channels', serverController.getServerChannels);

export default router;
