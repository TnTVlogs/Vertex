import { z } from 'zod';

// ─── Auth ───────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(32, 'Username must be at most 32 characters')
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dots and hyphens'),
    email: z
        .string()
        .email('Invalid email address')
        .max(254, 'Email is too long'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password is too long'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address').max(254),
    password: z.string().min(1, 'Password is required').max(128),
});

export const refreshSchema = z.object({
    refreshToken: z.string().uuid('Invalid refresh token'),
});

// ─── Social ─────────────────────────────────────────────────────────────────

export const sendFriendRequestSchema = z.object({
    fromId: z.string().uuid('Invalid user ID'),
    toUsername: z
        .string()
        .min(1, 'Username is required')
        .max(32, 'Username is too long'),
});

export const respondToRequestSchema = z.object({
    requestId: z.string().uuid('Invalid request ID'),
    status: z.enum(['accepted', 'declined'], {
        error: "Status must be 'accepted' or 'declined'",
    }),
});

// ─── Servers ─────────────────────────────────────────────────────────────────

export const createServerSchema = z.object({
    name: z
        .string()
        .min(1, 'Server name is required')
        .max(100, 'Server name must be at most 100 characters'),
    ownerId: z.string().uuid('Invalid owner ID'),
});

export const joinServerSchema = z.object({
    inviteCode: z.string().min(1, 'Invite code is required').max(64),
    userId: z.string().uuid('Invalid user ID'),
});

// ─── Server Settings ─────────────────────────────────────────────────────────

export const createChannelSchema = z.object({
    name: z
        .string()
        .min(1, 'Channel name is required')
        .max(100, 'Channel name must be at most 100 characters'),
    type: z.enum(['text', 'voice'], {
        error: "Channel type must be 'text' or 'voice'",
    }),
});

export const updateChannelSchema = z.object({
    name: z
        .string()
        .min(1, 'Channel name is required')
        .max(100, 'Channel name must be at most 100 characters'),
});

export const transferOwnershipSchema = z.object({
    newOwnerId: z.string().uuid('Invalid user ID'),
});
