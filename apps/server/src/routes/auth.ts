import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { loginSchema, refreshSchema, registerSchema } from '../middleware/schemas';

// 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// 3 registrations per hour per IP
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many registration attempts from this IP. Please try again later.' },
});

const router = Router();

router.post('/register', registerLimiter, validateBody(registerSchema), authController.register);
router.post('/login', loginLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me as any);

export default router;
