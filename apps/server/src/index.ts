import 'dotenv/config';
import './config/env';
import { httpServer } from './app';
import { connectRedis } from './services/redisService';
import logger from './utils/logger';

const init = async () => {
    try {
        await connectRedis();
    } catch (error) {
        logger.error({ err: error }, 'Failed to initialize services');
    }
};

init();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    logger.info(`Vertex Server running on port ${PORT}`);
});
