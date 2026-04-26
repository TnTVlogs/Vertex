import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { callService, CallType } from '../services/callService';
import { socialService } from '../services/socialService';
import logger from '../utils/logger';

const initiateSchema = z.object({
    targetUserId: z.string().uuid(),
    callType: z.enum(['audio', 'video']),
});

const callIdSchema = z.object({
    callId: z.string().uuid(),
});

const sdpSchema = z.object({
    callId: z.string().uuid(),
    targetUserId: z.string().uuid(),
    sdp: z.string().min(1),
});

const iceSchema = z.object({
    callId: z.string().uuid(),
    targetUserId: z.string().uuid(),
    candidate: z.record(z.string(), z.unknown()),
});

function getUserSockets(userToSockets: Map<string, Set<string>>, userId: string): Set<string> {
    return userToSockets.get(userId) ?? new Set();
}

export function registerCallHandler(
    io: Server,
    socket: Socket,
    userToSockets: Map<string, Set<string>>,
) {
    const userId = socket.data.userId as string;

    function emit(targetUserId: string, event: string, payload: unknown) {
        for (const sid of getUserSockets(userToSockets, targetUserId)) {
            io.to(sid).emit(event, payload);
        }
    }

    function socketError(message: string) {
        socket.emit('call:error', { message });
    }

    // ── call:initiate ───────────────────────────────────────────────────────
    socket.on('call:initiate', async (data: unknown) => {
        const parsed = initiateSchema.safeParse(data);
        if (!parsed.success) return socketError('Invalid payload');

        const { targetUserId, callType } = parsed.data;

        if (targetUserId === userId) return socketError('Cannot call yourself');

        const existingCall = await callService.getByUserId(userId);
        if (existingCall && existingCall.state !== 'ended') return socketError('Already in a call');

        const calleeCall = await callService.getByUserId(targetUserId);
        if (calleeCall && calleeCall.state !== 'ended') return socketError('User is already in a call');

        const friends = await socialService.areFriends(userId, targetUserId);
        if (!friends) return socketError('No active friendship with target user');

        const call = await callService.create(userId, targetUserId, callType as CallType);

        // Confirm to caller
        socket.emit('call:initiated', {
            callId: call.id,
            callType: call.callType,
            targetUserId,
        });

        // Notify callee
        emit(targetUserId, 'call:incoming', {
            callId: call.id,
            callType: call.callType,
            callerId: userId,
        });

        // Auto-expire ringing after 30s if not accepted
        setTimeout(async () => {
            const current = await callService.get(call.id);
            if (current?.state === 'ringing') {
                await callService.end(call.id);
                socket.emit('call:timeout', { callId: call.id });
                emit(targetUserId, 'call:timeout', { callId: call.id });
            }
        }, 30_000);

        logger.info({ callId: call.id, callerId: userId, calleeId: targetUserId, callType }, 'call:initiate');
    });

    // ── call:accepted ───────────────────────────────────────────────────────
    socket.on('call:accepted', async (data: unknown) => {
        const parsed = callIdSchema.safeParse(data);
        if (!parsed.success) return socketError('Invalid payload');

        const call = await callService.get(parsed.data.callId);
        if (!call) return socketError('Call not found');
        if (!callService.isParticipant(call, userId)) return socketError('Not a participant');
        if (call.state !== 'ringing') return socketError('Call not in ringing state');

        await callService.setState(call.id, 'active');

        const other = callService.otherParticipant(call, userId);
        emit(other, 'call:accepted', { callId: call.id });

        logger.info({ callId: call.id, userId }, 'call:accepted');
    });

    // ── call:rejected ───────────────────────────────────────────────────────
    socket.on('call:rejected', async (data: unknown) => {
        const parsed = callIdSchema.safeParse(data);
        if (!parsed.success) return socketError('Invalid payload');

        const call = await callService.get(parsed.data.callId);
        if (!call) return;
        if (!callService.isParticipant(call, userId)) return socketError('Not a participant');

        await callService.end(call.id);

        const other = callService.otherParticipant(call, userId);
        emit(other, 'call:rejected', { callId: call.id });

        logger.info({ callId: call.id, userId }, 'call:rejected');
    });

    // ── call:end ────────────────────────────────────────────────────────────
    socket.on('call:end', async (data: unknown) => {
        const parsed = callIdSchema.safeParse(data);
        if (!parsed.success) return socketError('Invalid payload');

        const call = await callService.get(parsed.data.callId);
        if (!call) return;
        if (!callService.isParticipant(call, userId)) return socketError('Not a participant');

        await callService.end(call.id);

        const other = callService.otherParticipant(call, userId);
        emit(other, 'call:ended', { callId: call.id });

        logger.info({ callId: call.id, userId }, 'call:end');
    });

    // ── call:sdp-offer ──────────────────────────────────────────────────────
    socket.on('call:sdp-offer', async (data: unknown) => {
        const parsed = sdpSchema.safeParse(data);
        if (!parsed.success) return socketError('Invalid payload');

        const { callId, targetUserId, sdp } = parsed.data;
        const call = await callService.get(callId);
        if (!call) return socketError('Call not found');
        if (!callService.isParticipant(call, userId)) return socketError('Not a participant');
        if (targetUserId !== callService.otherParticipant(call, userId)) return socketError('Invalid target');

        emit(targetUserId, 'call:sdp-offer', { callId, sdp, fromUserId: userId });
    });

    // ── call:sdp-answer ─────────────────────────────────────────────────────
    socket.on('call:sdp-answer', async (data: unknown) => {
        const parsed = sdpSchema.safeParse(data);
        if (!parsed.success) return socketError('Invalid payload');

        const { callId, targetUserId, sdp } = parsed.data;
        const call = await callService.get(callId);
        if (!call) return socketError('Call not found');
        if (!callService.isParticipant(call, userId)) return socketError('Not a participant');
        if (targetUserId !== callService.otherParticipant(call, userId)) return socketError('Invalid target');

        emit(targetUserId, 'call:sdp-answer', { callId, sdp, fromUserId: userId });
    });

    // ── call:ice-candidate ──────────────────────────────────────────────────
    socket.on('call:ice-candidate', async (data: unknown) => {
        const parsed = iceSchema.safeParse(data);
        if (!parsed.success) return socketError('Invalid payload');

        const { callId, targetUserId, candidate } = parsed.data;
        const call = await callService.get(callId);
        if (!call) return socketError('Call not found');
        if (!callService.isParticipant(call, userId)) return socketError('Not a participant');
        if (targetUserId !== callService.otherParticipant(call, userId)) return socketError('Invalid target');

        emit(targetUserId, 'call:ice-candidate', { callId, candidate, fromUserId: userId });
    });

    // ── call:video-toggle ───────────────────────────────────────────────────
    socket.on('call:video-toggle', async (data: unknown) => {
        const parsed = z.object({ callId: z.string().uuid(), enabled: z.boolean() }).safeParse(data);
        if (!parsed.success) return;
        const call = await callService.get(parsed.data.callId);
        if (!call || !callService.isParticipant(call, userId)) return;
        const other = callService.otherParticipant(call, userId);
        emit(other, 'call:video-toggle', { enabled: parsed.data.enabled, fromUserId: userId });
    });

    // ── call:share-screen ───────────────────────────────────────────────────
    socket.on('call:share-screen', async (data: unknown) => {
        const parsed = z.object({ callId: z.string().uuid(), enabled: z.boolean() }).safeParse(data);
        if (!parsed.success) return;
        const call = await callService.get(parsed.data.callId);
        if (!call || !callService.isParticipant(call, userId)) return;
        const other = callService.otherParticipant(call, userId);
        emit(other, 'call:share-screen', { enabled: parsed.data.enabled, fromUserId: userId });
    });
}
