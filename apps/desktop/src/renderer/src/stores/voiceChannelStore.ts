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
import { type CallQuality, VIDEO_CONSTRAINTS } from '../utils/webrtc'

export interface VoicePeer {
    peerId: string
    stream: MediaStream | null
    isMuted: boolean
}

export const useVoiceChannelStore = defineStore('voiceChannel', () => {
    const activeChannelId = ref<string | null>(null)
    const peers = ref<Map<string, VoicePeer>>(new Map())
    const localStream = ref<MediaStream | null>(null)
    const localVideoStream = ref<MediaStream | null>(null)
    const isMuted = ref(false)
    const isVideoOn = ref(false)
    const isScreenSharing = ref(false)
    const isConnecting = ref(false)
    const isSpeaking = ref(false)
    const speakingUsers = ref<Set<string>>(new Set())
    const videoQuality = ref<CallQuality>('medium')
    // Maps channelId → list of members currently in that voice channel
    const voiceChannelMembers = ref<Map<string, { userId: string; username: string }[]>>(new Map())

    let device: Device | null = null
    let sendTransport: any = null
    let recvTransport: any = null
    let audioProducer: any = null
    let videoProducer: any = null
    let screenProducer: any = null
    const consumers = new Map<string, any>()

    let audioCtx: AudioContext | null = null
    let analyserNode: AnalyserNode | null = null
    let speakingTimer: ReturnType<typeof setInterval> | null = null

    const VOICE_SESSION_KEY = 'vertex:voice-channel'

    function getInterruptedVoiceChannel(): string | null {
        try {
            const raw = sessionStorage.getItem(VOICE_SESSION_KEY)
            if (!raw) return null
            const { channelId, ts } = JSON.parse(raw)
            if (Date.now() - ts > 30_000) { sessionStorage.removeItem(VOICE_SESSION_KEY); return null }
            return channelId as string
        } catch { return null }
    }

    async function joinChannel(channelId: string, socket: Socket) {
        if (activeChannelId.value === channelId) return
        if (activeChannelId.value) await leaveChannel(socket)
        sessionStorage.setItem(VOICE_SESSION_KEY, JSON.stringify({ channelId, ts: Date.now() }))

        isConnecting.value = true
        try {
            await new Promise<void>((resolve, reject) => {
                socket.emit('channel:join-voice', { channelId })
                socket.once('channel:joined', async (data: any) => {
                    if (data.channelId !== channelId) return
                    try {
                        device = await createDevice(data.routerRtpCapabilities)
                        sendTransport = await createSendTransport(device, data.sendTransportParams as TransportParams, channelId, socket)
                        recvTransport = await createRecvTransport(device, data.recvTransportParams as TransportParams, channelId, socket)

                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                        localStream.value = stream
                        audioProducer = await sendTransport.produce({ track: stream.getAudioTracks()[0] })

                        activeChannelId.value = channelId
                        startSpeakingDetection(stream, socket)

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

        if (kind === 'video') {
            const videoCount = [...peers.value.values()].filter(
                p => (p.stream?.getVideoTracks().length ?? 0) > 0
            ).length
            if (videoCount >= 4) return
        }

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
        speakingUsers.value.delete(data.peerId)
    }

    function handlePeerJoined(data: { channelId: string; peerId: string }) {
        if (data.channelId !== activeChannelId.value) return
        if (!peers.value.has(data.peerId)) {
            peers.value.set(data.peerId, { peerId: data.peerId, stream: null, isMuted: false })
        }
    }

    function handleSpeaking(data: { channelId: string; userId: string; speaking: boolean }) {
        if (data.channelId !== activeChannelId.value) return
        if (data.speaking) speakingUsers.value.add(data.userId)
        else speakingUsers.value.delete(data.userId)
    }

    function handleVoiceMembers(data: { channelId: string; members: { userId: string; username: string }[] }) {
        voiceChannelMembers.value.set(data.channelId, data.members)
        voiceChannelMembers.value = new Map(voiceChannelMembers.value)
    }

    async function setVideoQuality(quality: CallQuality) {
        videoQuality.value = quality
        if (!isVideoOn.value || !videoProducer) return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS[quality], audio: false })
            const newTrack = stream.getVideoTracks()[0]
            await videoProducer.replaceTrack({ track: newTrack })
            localVideoStream.value?.getTracks().forEach(t => t.stop())
            localVideoStream.value = stream
        } catch {}
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

    async function toggleCamera(socket: Socket) {
        if (!sendTransport || !activeChannelId.value) return

        if (isVideoOn.value) {
            videoProducer?.close(); videoProducer = null
            localVideoStream.value?.getTracks().forEach(t => t.stop())
            localVideoStream.value = null
            isVideoOn.value = false
            socket.emit('channel:video-on', { channelId: activeChannelId.value, enabled: false })
            return
        }

        // Stop screen share if active (mutually exclusive)
        if (isScreenSharing.value) {
            screenProducer?.close(); screenProducer = null
            localVideoStream.value?.getTracks().forEach(t => t.stop())
            localVideoStream.value = null
            isScreenSharing.value = false
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            localVideoStream.value = stream
            const track = stream.getVideoTracks()[0]
            videoProducer = await sendTransport.produce({ track })
            isVideoOn.value = true
            socket.emit('channel:video-on', { channelId: activeChannelId.value, enabled: true })
        } catch {}
    }

    async function toggleScreenShare(socket: Socket) {
        if (!sendTransport || !activeChannelId.value) return

        if (isScreenSharing.value) {
            screenProducer?.close(); screenProducer = null
            localVideoStream.value?.getTracks().forEach(t => t.stop())
            localVideoStream.value = null
            isScreenSharing.value = false
            socket.emit('channel:video-on', { channelId: activeChannelId.value, enabled: false })
            return
        }

        // Stop camera if active (mutually exclusive)
        if (isVideoOn.value) {
            videoProducer?.close(); videoProducer = null
            localVideoStream.value?.getTracks().forEach(t => t.stop())
            localVideoStream.value = null
            isVideoOn.value = false
        }

        try {
            const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false })
            localVideoStream.value = stream
            const track = stream.getVideoTracks()[0]
            screenProducer = await sendTransport.produce({ track })
            isScreenSharing.value = true
            socket.emit('channel:video-on', { channelId: activeChannelId.value, enabled: true })

            track.onended = () => {
                screenProducer?.close(); screenProducer = null
                localVideoStream.value = null
                isScreenSharing.value = false
                if (activeChannelId.value) {
                    socket.emit('channel:video-on', { channelId: activeChannelId.value, enabled: false })
                }
            }
        } catch {}
    }

    function startSpeakingDetection(stream: MediaStream, socket: Socket) {
        try {
            audioCtx = new AudioContext()
            const source = audioCtx.createMediaStreamSource(stream)
            analyserNode = audioCtx.createAnalyser()
            analyserNode.fftSize = 512
            source.connect(analyserNode)

            const data = new Uint8Array(analyserNode.frequencyBinCount)
            let wasSpeaking = false

            speakingTimer = setInterval(() => {
                if (!analyserNode || !activeChannelId.value) return
                analyserNode.getByteFrequencyData(data)
                const avg = data.reduce((s, v) => s + v, 0) / data.length
                const speaking = avg > 20
                if (speaking !== wasSpeaking) {
                    wasSpeaking = speaking
                    isSpeaking.value = speaking
                    socket.emit('channel:speaking', { channelId: activeChannelId.value, speaking })
                }
            }, 100)
        } catch {}
    }

    function stopSpeakingDetection() {
        if (speakingTimer) { clearInterval(speakingTimer); speakingTimer = null }
        analyserNode = null
        audioCtx?.close().catch(() => {})
        audioCtx = null
    }

    async function leaveChannel(socket: Socket) {
        if (!activeChannelId.value) return
        const channelId = activeChannelId.value
        sessionStorage.removeItem(VOICE_SESSION_KEY)
        socket.emit('channel:leave-voice', { channelId })

        stopSpeakingDetection()

        videoProducer?.close(); videoProducer = null
        screenProducer?.close(); screenProducer = null
        localVideoStream.value?.getTracks().forEach(t => t.stop())
        localVideoStream.value = null
        isVideoOn.value = false
        isScreenSharing.value = false

        audioProducer?.close(); audioProducer = null
        for (const consumer of consumers.values()) consumer.close()
        consumers.clear()
        sendTransport?.close(); sendTransport = null
        recvTransport?.close(); recvTransport = null
        device = null

        localStream.value?.getTracks().forEach(t => t.stop())
        localStream.value = null
        peers.value.clear()
        speakingUsers.value.clear()
        isSpeaking.value = false
        activeChannelId.value = null
        isMuted.value = false
        // Leave voice channel → server will broadcast empty member list
    }

    return {
        activeChannelId, peers, localStream, localVideoStream,
        isMuted, isVideoOn, isScreenSharing, isConnecting, isSpeaking, speakingUsers, voiceChannelMembers, videoQuality,
        joinChannel, leaveChannel, toggleMute, toggleCamera, toggleScreenShare, setVideoQuality,
        handleNewProducer, handleProducerClosed, handlePeerLeft, handlePeerJoined, handleSpeaking, handleVoiceMembers,
        getInterruptedVoiceChannel,
    }
})
