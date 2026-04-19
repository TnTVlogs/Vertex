import { createClient } from 'redis';
import logger from '../utils/logger';

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
        logger.error({ err: err.message }, 'Redis client error (suppressing further logs)');
        redisErrorLogged = true;
    }
});

export const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            logger.info('Connected to Redis');
        }
    } catch (error) {
        logger.warn({ err: error }, 'Could not connect to Redis. Presence features will be limited.');
    }
};

const PRESENCE_TTL = 3600; // 1 hour — refreshed on activity

export const setPresence = async (userId: string, status: string) => {
    try {
        if (redisClient.isOpen) {
            await redisClient.set(`presence:${userId}`, status, { EX: PRESENCE_TTL });
        }
    } catch (e) {
        logger.error({ err: e }, 'Redis setPresence error');
    }
};

export const refreshPresenceTTL = async (userId: string) => {
    try {
        if (redisClient.isOpen) {
            await redisClient.expire(`presence:${userId}`, PRESENCE_TTL);
        }
    } catch (e) {
        logger.error({ err: e }, 'Redis refreshPresenceTTL error');
    }
};

export const getPresence = async (userId: string) => {
    try {
        if (redisClient.isOpen) {
            return await redisClient.get(`presence:${userId}`);
        }
    } catch (e) {
        logger.error({ err: e }, 'Redis getPresence error');
    }
    return null;
};

export const publishMessage = async (channel: string, message: any) => {
    try {
        if (redisClient.isOpen) {
            await redisClient.publish(channel, JSON.stringify(message));
        }
    } catch (e) {
        logger.error({ err: e }, 'Redis publishMessage error');
    }
};

export default redisClient;
