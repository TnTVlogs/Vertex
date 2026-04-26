import { Device } from 'mediasoup-client'
import type { RtpCapabilities, RtpParameters, DtlsParameters, MediaKind } from 'mediasoup-client/lib/types'
import type { Socket } from 'socket.io-client'

export interface TransportParams {
    id: string
    iceParameters: object
    iceCandidates: object[]
    dtlsParameters: object
}

export async function createDevice(routerRtpCapabilities: RtpCapabilities): Promise<Device> {
    const device = new Device()
    await device.load({ routerRtpCapabilities })
    return device
}

export async function createSendTransport(
    device: Device,
    params: TransportParams,
    channelId: string,
    socket: Socket,
) {
    const transport = device.createSendTransport(params as any)

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('channel:transport-connect', {
            channelId,
            transportId: transport.id,
            dtlsParameters,
        })
        callback()
    })

    transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
        socket.emit('channel:produce', { channelId, kind, rtpParameters }, (res: any) => {
            if (res.error) errback(new Error(res.error))
            else callback({ id: res.producerId })
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

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
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
            if (res.error) return reject(new Error(res.error))
            const consumer = await recvTransport.consume({
                id: res.consumerId,
                producerId: res.producerId,
                kind: res.kind,
                rtpParameters: res.rtpParameters,
            })
            socket.emit('channel:resume-consumer', { channelId, consumerId: consumer.id })
            const stream = new MediaStream([consumer.track])
            resolve({ consumer, stream })
        })
    })
}
