import prisma from './prisma';
import { TIER_LIMITS, Tier, TierLimits } from '../config/limits.config';
import logger from '../utils/logger';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: Record<Tier, TierLimits> | null = null;
let cacheExpiresAt = 0;

async function loadFromDb(): Promise<Record<Tier, TierLimits> | null> {
    try {
        const rows = await prisma.tierConfig.findMany();
        if (rows.length === 0) return null;
        const result: Partial<Record<Tier, TierLimits>> = {};
        for (const row of rows) {
            result[row.tier as Tier] = {
                maxDailyMessages: row.maxDailyMessages,
                maxMessageLength: row.maxMessageLength,
                maxServersPerUser: row.maxServersPerUser,
            };
        }
        const tiers: Tier[] = ['BASIC', 'PRO', 'VIP'];
        if (!tiers.every(t => result[t])) return null;
        return result as Record<Tier, TierLimits>;
    } catch (err) {
        logger.warn({ err }, 'tierService: DB read failed, using config fallback');
        return null;
    }
}

export async function getLimits(tier: Tier): Promise<TierLimits> {
    const now = Date.now();
    if (!cache || now > cacheExpiresAt) {
        const fromDb = await loadFromDb();
        cache = fromDb ?? TIER_LIMITS;
        cacheExpiresAt = now + CACHE_TTL_MS;
    }
    return cache[tier] ?? TIER_LIMITS[tier];
}

export function invalidateCache() {
    cache = null;
    cacheExpiresAt = 0;
}
