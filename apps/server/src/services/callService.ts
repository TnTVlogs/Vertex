import { v4 as uuidv4 } from 'uuid';
import redisClient from './redisService';

export type CallType = 'audio' | 'video';
export type CallState = 'ringing' | 'active' | 'ended';

export interface ActiveCall {
    id: string;
    callerId: string;
    calleeId: string;
    callType: CallType;
    startedAt: Date;
    state: CallState;
}

const CALL_TTL_S = 3600;
const calls = new Map<string, ActiveCall>(); // in-memory fallback
const userCallIndex = new Map<string, string>(); // userId → callId

function key(callId: string) { return `call:${callId}`; }

export const callService = {
    async create(callerId: string, calleeId: string, callType: CallType): Promise<ActiveCall> {
        const call: ActiveCall = {
            id: uuidv4(),
            callerId,
            calleeId,
            callType,
            startedAt: new Date(),
            state: 'ringing',
        };
        if (redisClient.isOpen) {
            await redisClient.setEx(key(call.id), CALL_TTL_S, JSON.stringify(call));
            await redisClient.setEx(`call-user:${callerId}`, CALL_TTL_S, call.id);
            await redisClient.setEx(`call-user:${calleeId}`, CALL_TTL_S, call.id);
        } else {
            calls.set(call.id, call);
            userCallIndex.set(callerId, call.id);
            userCallIndex.set(calleeId, call.id);
        }
        return call;
    },

    async get(callId: string): Promise<ActiveCall | null> {
        if (redisClient.isOpen) {
            const raw = await redisClient.get(key(callId));
            return raw ? JSON.parse(raw) : null;
        }
        return calls.get(callId) ?? null;
    },

    async setState(callId: string, state: CallState): Promise<void> {
        if (redisClient.isOpen) {
            const raw = await redisClient.get(key(callId));
            if (!raw) return;
            const call: ActiveCall = { ...JSON.parse(raw), state };
            await redisClient.setEx(key(callId), CALL_TTL_S, JSON.stringify(call));
        } else {
            const call = calls.get(callId);
            if (call) call.state = state;
        }
    },

    async end(callId: string): Promise<void> {
        if (redisClient.isOpen) {
            const raw = await redisClient.get(key(callId));
            if (raw) {
                const call: ActiveCall = JSON.parse(raw);
                await redisClient.del([key(callId), `call-user:${call.callerId}`, `call-user:${call.calleeId}`]);
            }
        } else {
            const call = calls.get(callId);
            if (call) {
                userCallIndex.delete(call.callerId);
                userCallIndex.delete(call.calleeId);
            }
            calls.delete(callId);
        }
    },

    async getByUserId(userId: string): Promise<ActiveCall | null> {
        if (redisClient.isOpen) {
            const callId = await redisClient.get(`call-user:${userId}`);
            return callId ? this.get(callId) : null;
        }
        const callId = userCallIndex.get(userId);
        return callId ? (calls.get(callId) ?? null) : null;
    },

    isParticipant(call: ActiveCall, userId: string): boolean {
        return call.callerId === userId || call.calleeId === userId;
    },

    otherParticipant(call: ActiveCall, userId: string): string {
        return call.callerId === userId ? call.calleeId : call.callerId;
    },
};
