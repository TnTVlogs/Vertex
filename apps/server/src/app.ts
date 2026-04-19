import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './swagger';
import authRoutes from './routes/auth';
import socialRoutes from './routes/social';
import serverRoutes from './routes/servers';
import messagesRoutes from './routes/messages';
import adminRoutes from './routes/admin';
import { handleSocketConnections } from './socket/socketHandler';
import { serverService } from './services/serverService';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
});

app.set('trust proxy', 1);
app.set('io', io);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
}));
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/servers', serverRoutes);
app.use('/api/v1/messages', messagesRoutes);
app.use('/api/v1/admin', adminRoutes);

app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use(errorHandler);

handleSocketConnections(io);

// Clean up expired invite codes every hour
const INVITE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
setInterval(async () => {
    try {
        const result = await serverService.cleanupExpiredInvites();
        if (result.count > 0) logger.info({ count: result.count }, 'Expired invites cleaned up');
    } catch (err) {
        logger.error({ err }, 'Invite cleanup failed');
    }
}, INVITE_CLEANUP_INTERVAL_MS);

export { app, httpServer, io };
