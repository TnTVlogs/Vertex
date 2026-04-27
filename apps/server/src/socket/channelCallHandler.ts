import { Server, Socket } from 'socket.io'
import { z } from 'zod'
import { sfuService } from '../services/sfuService'
import { serverService } from '../services/serverService'
import prisma from '../services/prisma'
import logger from '../utils/logger'

const joinSchema = z.object({ channelId: z.string().uuid() })
const connectSchema = z.object({
    channelId: z.string().uuid(),
    transportId: z.string(),
    dtlsParameters: z.record(z.string(), z.unknown()),
})
const produceSchema = z.object({
    channelId: z.string().uuid(),
    kind: z.enum(['audio', 'video']),
    rtpParameters: z.record(z.string(), z.unknown()),
})
const consumeSchema = z.object({
    channelId: z.string().uuid(),
    producerId: z.string(),
    rtpCapabilities: z.record(z.string(), z.unknown()),
})
const resumeSchema = z.object({ channelId: z.string().uuid(), consumerId: z.string() })
const leaveSchema = z.object({ channelId: z.string().uuid() })

export function registerChannelCallHandler(io: Server, socket: Socket) {
    const userId = socket.data.userId as string

    function err(msg: string) { socket.emit('channel:error', { message: msg }) }

    async function broadcastVoiceMembers(channelId: string) {
        const serverId = await serverService.getChannelServerId(channelId)
        if (!serverId) return
        const peerIds = sfuService.getRoomPeerIds(channelId)
        const users = await prisma.user.findMany({
            where: { id: { in: peerIds } },
            select: { id: true, username: true },
        })
        io.to(`server:${serverId}`).emit('channel:voice-members', {
            channelId,
            members: users.map(u => ({ userId: u.id, username: u.username })),
        })
    }

    // ── channel:join-voice ─────────────────────────────────────────────────────
    socket.on('channel:join-voice', async (data: unknown) => {
        const parsed = joinSchema.safeParse(data)
        if (!parsed.success) return err('Invalid payload')
        const { channelId } = parsed.data

        const isMember = await serverService.isUserMemberOfChannel(userId, channelId)
        if (!isMember) return err('Not a member of this channel')

        try {
            const result = await sfuService.joinRoom(channelId, userId)
            socket.join(`voice:${channelId}`)

            // Tell the joiner the room state
            socket.emit('channel:joined', { channelId, ...result })

            // Tell others a new peer arrived
            socket.to(`voice:${channelId}`).emit('channel:peer-joined', {
                channelId, peerId: userId,
            })

            // Send voice members directly to the joiner (they may not be in the server room yet)
            const serverId = await serverService.getChannelServerId(channelId)
            if (serverId) {
                const peerIds = sfuService.getRoomPeerIds(channelId)
                const users = await prisma.user.findMany({
                    where: { id: { in: peerIds } },
                    select: { id: true, username: true },
                })
                socket.emit('channel:voice-members', {
                    channelId,
                    members: users.map(u => ({ userId: u.id, username: u.username })),
                })
                // Also join the server room if not already in it, so future updates arrive
                socket.join(`server:${serverId}`)
            }

            broadcastVoiceMembers(channelId)
            logger.info({ userId, channelId }, 'channel:join-voice')
        } catch (e: any) {
            logger.error({ err: e }, 'channel:join-voice failed')
            err('Failed to join voice channel')
        }
    })

    // ── channel:transport-connect ──────────────────────────────────────────────
    socket.on('channel:transport-connect', async (data: unknown) => {
        const parsed = connectSchema.safeParse(data)
        if (!parsed.success) return err('Invalid payload')
        const { channelId, transportId, dtlsParameters } = parsed.data

        await sfuService.connectTransport(
            channelId, userId, transportId,
            dtlsParameters as any,
        )
    })

    // ── channel:produce ────────────────────────────────────────────────────────
    socket.on('channel:produce', async (data: unknown, callback: (res: any) => void) => {
        const parsed = produceSchema.safeParse(data)
        if (!parsed.success) return callback?.({ error: 'Invalid payload' })
        const { channelId, kind, rtpParameters } = parsed.data

        try {
            const producerId = await sfuService.produce(
                channelId, userId, kind as any, rtpParameters as any,
            )
            callback?.({ producerId })

            // Notify others so they can consume
            socket.to(`voice:${channelId}`).emit('channel:new-producer', {
                channelId, producerId, peerId: userId, kind,
            })
        } catch (e: any) {
            callback?.({ error: e.message })
        }
    })

    // ── channel:consume ────────────────────────────────────────────────────────
    socket.on('channel:consume', async (data: unknown, callback: (res: any) => void) => {
        const parsed = consumeSchema.safeParse(data)
        if (!parsed.success) return callback?.({ error: 'Invalid payload' })
        const { channelId, producerId, rtpCapabilities } = parsed.data

        try {
            const params = await sfuService.consume(
                channelId, userId, producerId, rtpCapabilities as any,
            )
            callback?.({ ...params })
        } catch (e: any) {
            callback?.({ error: e.message })
        }
    })

    // ── channel:resume-consumer ────────────────────────────────────────────────
    socket.on('channel:resume-consumer', async (data: unknown) => {
        const parsed = resumeSchema.safeParse(data)
        if (!parsed.success) return
        await sfuService.resumeConsumer(parsed.data.channelId, userId, parsed.data.consumerId)
    })

    // ── channel:leave-voice ────────────────────────────────────────────────────
    socket.on('channel:leave-voice', (data: unknown) => {
        const parsed = leaveSchema.safeParse(data)
        if (!parsed.success) return
        const { channelId } = parsed.data
        handleLeave(channelId)
    })

    // ── channel:speaking ──────────────────────────────────────────────────────
    socket.on('channel:speaking', (data: { channelId: string; speaking: boolean }) => {
        if (!data.channelId) return
        socket.to(`voice:${data.channelId}`).emit('channel:speaking', {
            channelId: data.channelId, userId, speaking: data.speaking,
        })
    })

    // ── channel:video-on ──────────────────────────────────────────────────────
    socket.on('channel:video-on', (data: { channelId: string; enabled: boolean }) => {
        if (!data.channelId) return
        socket.to(`voice:${data.channelId}`).emit('channel:video-on', {
            channelId: data.channelId, userId, enabled: data.enabled,
        })
    })

    // Auto-leave on socket disconnect
    socket.on('disconnecting', () => {
        const voiceRooms = [...socket.rooms].filter(r => r.startsWith('voice:'))
        for (const room of voiceRooms) {
            const channelId = room.replace('voice:', '')
            handleLeave(channelId)
        }
    })

    function handleLeave(channelId: string) {
        const closedProducerIds = sfuService.leaveRoom(channelId, userId)
        socket.leave(`voice:${channelId}`)

        if (closedProducerIds.length > 0) {
            io.to(`voice:${channelId}`).emit('channel:producer-closed', {
                channelId, peerId: userId, producerIds: closedProducerIds,
            })
        }

        io.to(`voice:${channelId}`).emit('channel:peer-left', {
            channelId, peerId: userId,
        })

        broadcastVoiceMembers(channelId)
        logger.info({ userId, channelId }, 'channel:leave-voice')
    }
}
