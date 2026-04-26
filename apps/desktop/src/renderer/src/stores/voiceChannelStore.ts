import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Device } from 'mediasoup-client'
import type { Socket } from 'socket.io-client'
import {
    createDevice,
    createSendTransport,
    createRecvTransport,
    consumeProducer,
    type TransportParams,
} from '../utils/sfuClient'

export interface VoicePeer {
    peerId: string
    stream: MediaStream | null
    isMuted: boolean
}

export const useVoiceChannelStore = defineStore('voiceChannel', () => {
    const activeChannelId = ref<string | null>(null)
    const peers = ref<Map<string, VoicePeer>>(new Map())
    const localStream = ref<MediaStream | null>(null)
    const isMuted = ref(false)
    const isConnecting = ref(false)

    let device: Device | null = null
    let sendTransport: any = null
    let recvTransport: any = null
    let audioProducer: any = null
    const consumers = new Map<string, any>() // producerId → consumer

    async function joinChannel(channelId: string, socket: Socket) {
        if (activeChannelId.value === channelId) return
        if (activeChannelId.value) await leaveChannel(socket)

        isConnecting.value = true
        try {
            await new Promise<void>((resolve, reject) => {
                socket.emit('channel:join-voice', { channelId }, )
                socket.once('channel:joined', async (data: any) => {
                    if (data.channelId !== channelId) return
                    try {
                        device = await createDevice(data.routerRtpCapabilities)
                        sendTransport = await createSendTransport(device, data.sendTransportParams as TransportParams, channelId, socket)
                        recvTransport = await createRecvTransport(device, data.recvTransportParams as TransportParams, channelId, socket)

                        // Get local audio
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                        localStream.value = stream
                        audioProducer = await sendTransport.produce({ track: stream.getAudioTracks()[0] })

                        activeChannelId.value = channelId

                        // Consume existing peers
                        for (const { producerId, peerId, kind } of data.existingProducers) {
                            await consumePeer(channelId, producerId, peerId, kind, socket)
                        }

                        resolve()
                    } catch (e) { reject(e) }
                })
            })
        } finally {
            isConnecting.value = false
        }
    }

    async function consumePeer(channelId: string, producerId: string, peerId: string, kind: string, socket: Socket) {
        if (!device || !recvTransport) return
        try {
            const { consumer, stream } = await consumeProducer(
                recvTransport, channelId, producerId, device.rtpCapabilities, socket,
            )
            consumers.set(producerId, consumer)

            if (!peers.value.has(peerId)) {
                peers.value.set(peerId, { peerId, stream: null, isMuted: false })
            }
            const peer = peers.value.get(peerId)!
            if (peer.stream) {
                stream.getTracks().forEach(t => peer.stream!.addTrack(t))
            } else {
                peer.stream = stream
            }
            peers.value.set(peerId, { ...peer })
        } catch {}
    }

    function handleNewProducer(data: { channelId: string; producerId: string; peerId: string; kind: string }, socket: Socket) {
        if (data.channelId !== activeChannelId.value) return
        consumePeer(data.channelId, data.producerId, data.peerId, data.kind, socket)
    }

    function handleProducerClosed(data: { channelId: string; peerId: string; producerIds: string[] }) {
        if (data.channelId !== activeChannelId.value) return
        for (const producerId of data.producerIds) {
            const consumer = consumers.get(producerId)
            consumer?.close()
            consumers.delete(producerId)
        }
    }

    function handlePeerLeft(data: { channelId: string; peerId: string }) {
        if (data.channelId !== activeChannelId.value) return
        peers.value.delete(data.peerId)
    }

    function handlePeerJoined(data: { channelId: string; peerId: string }) {
        if (data.channelId !== activeChannelId.value) return
        if (!peers.value.has(data.peerId)) {
            peers.value.set(data.peerId, { peerId: data.peerId, stream: null, isMuted: false })
        }
    }

    function toggleMute() {
        if (!localStream.value) return
        const enabled = !isMuted.value
        localStream.value.getAudioTracks().forEach(t => { t.enabled = !enabled })
        if (audioProducer) {
            if (enabled) audioProducer.pause()
            else audioProducer.resume()
        }
        isMuted.value = enabled
    }

    async function leaveChannel(socket: Socket) {
        if (!activeChannelId.value) return
        const channelId = activeChannelId.value

        socket.emit('channel:leave-voice', { channelId })

        audioProducer?.close(); audioProducer = null
        for (const consumer of consumers.values()) consumer.close()
        consumers.clear()
        sendTransport?.close(); sendTransport = null
        recvTransport?.close(); recvTransport = null
        device = null

        localStream.value?.getTracks().forEach(t => t.stop())
        localStream.value = null
        peers.value.clear()
        activeChannelId.value = null
        isMuted.value = false
    }

    return {
        activeChannelId, peers, localStream, isMuted, isConnecting,
        joinChannel, leaveChannel, toggleMute,
        handleNewProducer, handleProducerClosed, handlePeerLeft, handlePeerJoined,
    }
})
