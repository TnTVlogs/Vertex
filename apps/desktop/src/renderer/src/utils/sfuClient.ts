import { Device, types as mediasoupTypes } from 'mediasoup-client'
import type { Socket } from 'socket.io-client'

type RtpCapabilities = mediasoupTypes.RtpCapabilities
type RtpParameters = mediasoupTypes.RtpParameters

export interface TransportParams {
    id: string
    iceParameters: object
    iceCandidates: object[]
    dtlsParameters: object
}

export async function createDevice(routerRtpCapabilities: RtpCapabilities): Promise<Device> {
    const device = new Device()
    await device.load({ routerRtpCapabilities })
    console.log('[SFU] Device loaded, canProduce audio:', device.canProduce('audio'))
    return device
}

export async function createSendTransport(
    device: Device,
    params: TransportParams,
    channelId: string,
    socket: Socket,
) {
    const transport = device.createSendTransport(params as any)
    console.log('[SFU] SendTransport created, iceCandidates:', (params.iceCandidates as any[]).map((c: any) => c.address ?? c.ip))

    transport.on('connectionstatechange', (state) => {
        console.log('[SFU] SendTransport connectionstate:', state)
    })
    transport.on('icegatheringstatechange', (state) => {
        console.log('[SFU] SendTransport iceGathering:', state)
    })

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        console.log('[SFU] SendTransport connect event fired')
        socket.emit('channel:transport-connect', {
            channelId,
            transportId: transport.id,
            dtlsParameters,
        })
        callback()
    })

    transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
        console.log('[SFU] Producing', kind)
        socket.emit('channel:produce', { channelId, kind, rtpParameters }, (res: any) => {
            if (res.error) { console.error('[SFU] produce error:', res.error); errback(new Error(res.error)) }
            else { console.log('[SFU] Produced', kind, 'producerId:', res.producerId); callback({ id: res.producerId }) }
        })
    })

    return transport
}

export async function createRecvTransport(
    device: Device,
    params: TransportParams,
    channelId: string,
    socket: Socket,
) {
    const transport = device.createRecvTransport(params as any)
    console.log('[SFU] RecvTransport created, iceCandidates:', (params.iceCandidates as any[]).map((c: any) => c.address ?? c.ip))

    transport.on('connectionstatechange', (state) => {
        console.log('[SFU] RecvTransport connectionstate:', state)
    })
    transport.on('icegatheringstatechange', (state) => {
        console.log('[SFU] RecvTransport iceGathering:', state)
    })

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        console.log('[SFU] RecvTransport connect event fired')
        socket.emit('channel:transport-connect', {
            channelId,
            transportId: transport.id,
            dtlsParameters,
        })
        callback()
    })

    return transport
}

export async function consumeProducer(
    recvTransport: ReturnType<Device['createRecvTransport']>,
    channelId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
    socket: Socket,
): Promise<{ consumer: any; stream: MediaStream }> {
    return new Promise((resolve, reject) => {
        socket.emit('channel:consume', { channelId, producerId, rtpCapabilities }, async (res: any) => {
            if (res.error) { console.error('[SFU] consume error:', res.error); return reject(new Error(res.error)) }
            console.log('[SFU] Consuming producerId:', res.producerId, 'kind:', res.kind)
            const consumer = await recvTransport.consume({
                id: res.consumerId,
                producerId: res.producerId,
                kind: res.kind,
                rtpParameters: res.rtpParameters,
            })
            console.log('[SFU] Consumer created, track readyState:', consumer.track.readyState, 'paused:', consumer.paused)
            socket.emit('channel:resume-consumer', { channelId, consumerId: consumer.id })
            const stream = new MediaStream([consumer.track])
            resolve({ consumer, stream })
        })
    })
}
