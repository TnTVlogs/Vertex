import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis } from './services/redisService';
import authRoutes from './routes/auth';
import socialRoutes from './routes/social';
import serverRoutes from './routes/servers';
import messagesRoutes from './routes/messages';
import { handleSocketConnections } from './socket/socketHandler';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'] // Prioritize websocket for stability through Apache
});

app.set('io', io);

app.use(cors());
app.use(express.json());

// Routes prefixed with /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/servers', serverRoutes);
app.use('/api/v1/messages', messagesRoutes);

// Initialize services
const init = async () => {
    try {
        await connectRedis();
    } catch (error) {
        console.error('Failed to initialize services:', error);
    }
};

init();

// Initialize Socket.io Logic
handleSocketConnections(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Vertex Server running on port ${PORT}`);
});
