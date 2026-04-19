import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireActive } from '../middleware/requireActive';
import { avatarUpload, attachmentUpload } from '../middleware/upload';
import { updateProfile, uploadAvatar, uploadAttachment } from '../controllers/userController';

const router = Router();

router.patch('/profile', requireAuth, requireActive, updateProfile);

router.post('/avatar', requireAuth, requireActive, (req, res, next) => {
    avatarUpload.single('avatar')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        next();
    });
}, uploadAvatar);

router.post('/attachment', requireAuth, requireActive, (req, res, next) => {
    attachmentUpload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        next();
    });
}, uploadAttachment);

export default router;
