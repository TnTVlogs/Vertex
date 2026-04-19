import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                return false; // Stop Retrying after 5 times to avoid log spam
            }
            return 1000;
        }
    }
});

let redisErrorLogged = false;
redisClient.on('error', (err) => {
    if (!redisErrorLogged) {
        console.log('Redis Client Error (Suppressing further logs):', err.message);
        redisErrorLogged = true;
    }
});

export const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            console.log('Connected to Redis');
        }
    } catch (error) {
        console.warn('Could not connect to Redis. Presence features will be limited.', error);
    }
};

const PRESENCE_TTL = 3600; // 1 hour — refreshed on activity

export const setPresence = async (userId: string, status: string) => {
    try {
        if (redisClient.isOpen) {
            await redisClient.set(`presence:${userId}`, status, { EX: PRESENCE_TTL });
        }
    } catch (e) {
        console.error('Redis setPresence error:', e);
    }
};

export const refreshPresenceTTL = async (userId: string) => {
    try {
        if (redisClient.isOpen) {
            await redisClient.expire(`presence:${userId}`, PRESENCE_TTL);
        }
    } catch (e) {
        console.error('Redis refreshPresenceTTL error:', e);
    }
};

export const getPresence = async (userId: string) => {
    try {
        if (redisClient.isOpen) {
            return await redisClient.get(`presence:${userId}`);
        }
    } catch (e) {
        console.error('Redis getPresence error:', e);
    }
    return null;
};

export const publishMessage = async (channel: string, message: any) => {
    try {
        if (redisClient.isOpen) {
            await redisClient.publish(channel, JSON.stringify(message));
        }
    } catch (e) {
        console.error('Redis publishMessage error:', e);
    }
};

export default redisClient;
