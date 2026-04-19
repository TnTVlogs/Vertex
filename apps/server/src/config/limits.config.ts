// ── TIER LIMITS CONFIGURATION ────────────────────────────────────────────────
// Defines the resource limits per user tier.
// This is intentionally a plain JS object (no env vars) to allow the admin
// panel to read these values and display them on the frontend in the future.

export type Tier = 'BASIC' | 'PRO' | 'VIP';

export interface TierLimits {
    maxDailyMessages: number;
    maxMessageLength: number;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
    BASIC: {
        maxDailyMessages: 200,
        maxMessageLength: 200,
    },
    PRO: {
        maxDailyMessages: 400,
        maxMessageLength: 400,
    },
    VIP: {
        maxDailyMessages: 500,
        maxMessageLength: 500,
    },
};

// IP registration limit: max accounts per IP
export const MAX_ACCOUNTS_PER_IP = 5;
