import * as mediasoup from 'mediasoup'
import logger from '../utils/logger'

const CODECS = [
    { kind: 'audio' as const, mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
    { kind: 'video' as const, mimeType: 'video/VP8', clockRate: 90000 },
] as mediasoup.types.RtpCodecCapability[]

function transportOptions(): mediasoup.types.WebRtcTransportOptions {
    return {
        listenInfos: [
            {
                protocol: 'udp',
                ip: '0.0.0.0',
                announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
            },
            {
                protocol: 'tcp',
                ip: '0.0.0.0',
                announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
            },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 600_000,
    }
}

interface PeerState {
    sendTransport?: mediasoup.types.WebRtcTransport
    recvTransport?: mediasoup.types.WebRtcTransport
    producers: Map<string, mediasoup.types.Producer>
    consumers: Map<string, mediasoup.types.Consumer>
}

interface Room {
    router: mediasoup.types.Router
    peers: Map<string, PeerState>
}

let _worker: mediasoup.types.Worker | null = null
const rooms = new Map<string, Room>()

async function getWorker(): Promise<mediasoup.types.Worker> {
    if (_worker) return _worker
    _worker = await mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: Number(process.env.MEDIASOUP_RTC_MIN_PORT ?? 40000),
        rtcMaxPort: Number(process.env.MEDIASOUP_RTC_MAX_PORT ?? 49999),
    })
    _worker.on('died', () => {
        logger.error('mediasoup worker died — restarting process')
        process.exit(1)
    })
    logger.info('mediasoup worker ready')
    return _worker
}

async function getOrCreateRoom(channelId: string): Promise<Room> {
    if (!rooms.has(channelId)) {
        const worker = await getWorker()
        const router = await worker.createRouter({ mediaCodecs: CODECS })
        rooms.set(channelId, { router, peers: new Map() })
    }
    return rooms.get(channelId)!
}

function getOrCreatePeer(room: Room, userId: string): PeerState {
    if (!room.peers.has(userId)) {
        room.peers.set(userId, { producers: new Map(), consumers: new Map() })
    }
    return room.peers.get(userId)!
}

function transportParams(t: mediasoup.types.WebRtcTransport) {
    return {
        id: t.id,
        iceParameters: t.iceParameters,
        iceCandidates: t.iceCandidates,
        dtlsParameters: t.dtlsParameters,
    }
}

export const sfuService = {
    async joinRoom(channelId: string, userId: string) {
        const room = await getOrCreateRoom(channelId)
        const peer = getOrCreatePeer(room, userId)

        // Close existing transports if rejoining
        peer.sendTransport?.close()
        peer.recvTransport?.close()

        const [send, recv] = await Promise.all([
            room.router.createWebRtcTransport(transportOptions()),
            room.router.createWebRtcTransport(transportOptions()),
        ])
        peer.sendTransport = send
        peer.recvTransport = recv

        const existingProducers: { producerId: string; peerId: string; kind: string }[] = []
        for (const [peerId, p] of room.peers) {
            if (peerId === userId) continue
            for (const [producerId, producer] of p.producers) {
                existingProducers.push({ producerId, peerId, kind: producer.kind })
            }
        }

        return {
            routerRtpCapabilities: room.router.rtpCapabilities,
            sendTransportParams: transportParams(send),
            recvTransportParams: transportParams(recv),
            existingProducers,
        }
    },

    async connectTransport(
        channelId: string,
        userId: string,
        transportId: string,
        dtlsParameters: mediasoup.types.DtlsParameters,
    ) {
        const room = rooms.get(channelId)
        const peer = room?.peers.get(userId)
        if (!peer) return
        const t = peer.sendTransport?.id === transportId ? peer.sendTransport : peer.recvTransport
        if (t) await t.connect({ dtlsParameters })
    },

    async produce(
        channelId: string,
        userId: string,
        kind: mediasoup.types.MediaKind,
        rtpParameters: mediasoup.types.RtpParameters,
    ): Promise<string> {
        const room = rooms.get(channelId)
        const peer = room?.peers.get(userId)
        if (!peer?.sendTransport) throw new Error('No send transport')

        const producer = await peer.sendTransport.produce({ kind, rtpParameters })
        peer.producers.set(producer.id, producer)
        producer.on('transportclose', () => peer.producers.delete(producer.id))
        return producer.id
    },

    async consume(
        channelId: string,
        userId: string,
        producerId: string,
        rtpCapabilities: mediasoup.types.RtpCapabilities,
    ) {
        const room = rooms.get(channelId)
        const peer = room?.peers.get(userId)
        if (!peer?.recvTransport) throw new Error('No recv transport')
        if (!room!.router.canConsume({ producerId, rtpCapabilities })) throw new Error('Cannot consume')

        const consumer = await peer.recvTransport.consume({
            producerId,
            rtpCapabilities,
            paused: true,
        })
        peer.consumers.set(consumer.id, consumer)
        consumer.on('transportclose', () => peer.consumers.delete(consumer.id))
        consumer.on('producerclose', () => peer.consumers.delete(consumer.id))

        return {
            consumerId: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        }
    },

    async resumeConsumer(channelId: string, userId: string, consumerId: string) {
        const room = rooms.get(channelId)
        const consumer = room?.peers.get(userId)?.consumers.get(consumerId)
        if (consumer) await consumer.resume()
    },

    leaveRoom(channelId: string, userId: string): string[] {
        const room = rooms.get(channelId)
        if (!room) return []
        const peer = room.peers.get(userId)
        if (!peer) return []

        const closedProducerIds = [...peer.producers.keys()]
        peer.sendTransport?.close()
        peer.recvTransport?.close()
        room.peers.delete(userId)

        if (room.peers.size === 0) {
            room.router.close()
            rooms.delete(channelId)
        }

        return closedProducerIds
    },

    getRoomPeerIds(channelId: string): string[] {
        return [...(rooms.get(channelId)?.peers.keys() ?? [])]
    },
}
