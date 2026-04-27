import type { Socket } from 'socket.io-client'
import { ENV } from './env'

const FALLBACK_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

let cachedIceServers: RTCIceServer[] | null = null

export async function fetchIceServers(token: string): Promise<RTCIceServer[]> {
    if (cachedIceServers) return cachedIceServers
    try {
        const res = await fetch(`${ENV.API_URL}/call/ice-servers`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
            const data = await res.json()
            cachedIceServers = data.iceServers
            return cachedIceServers!
        }
    } catch {}
    return FALLBACK_ICE
}

export function createPeerConnection(
    callId: string,
    peerId: string,
    socket: Socket,
    iceServers: RTCIceServer[],
    onRemoteStream: (stream: MediaStream) => void,
    onConnectionStateChange: (state: RTCPeerConnectionState) => void,
): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers })

    pc.ontrack = (event) => {
        // Create new MediaStream on every track event so Vue detects the ref change
        // and re-evaluates hasRemoteVideo (same object ref = no reactivity trigger)
        if (event.streams[0]) onRemoteStream(new MediaStream(event.streams[0].getTracks()))
    }

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('call:ice-candidate', {
                callId,
                targetUserId: peerId,
                candidate: event.candidate.toJSON(),
            })
        }
    }

    pc.onconnectionstatechange = () => {
        onConnectionStateChange(pc.connectionState)
    }

    // ICE restart on failure
    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
            pc.restartIce()
            // Caller must send new offer with iceRestart — handled via onnegotiationneeded
        }
    }

    // Automatic renegotiation when tracks added/replaced trigger negotiation needed
    pc.onnegotiationneeded = async () => {
        try {
            const offer = await pc.createOffer()
            if (pc.signalingState !== 'stable') return
            await pc.setLocalDescription(offer)
            socket.emit('call:sdp-offer', { callId, targetUserId: peerId, sdp: offer.sdp })
        } catch {}
    }

    return pc
}

export async function getAudioStream(quality: CallQuality = 'medium'): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS[quality], video: false })
}

export type CallQuality = 'low' | 'medium' | 'high'

const VIDEO_CONSTRAINTS: Record<CallQuality, MediaTrackConstraints> = {
    low:    { width: 320,  height: 240,  frameRate: 15 },
    medium: { width: 640,  height: 480,  frameRate: 30 },
    high:   { width: 1280, height: 720,  frameRate: 60 },
}

const AUDIO_CONSTRAINTS: Record<CallQuality, MediaTrackConstraints> = {
    low:    { sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
    medium: { sampleRate: 32000, echoCancellation: true, noiseSuppression: true },
    high:   { sampleRate: 48000, echoCancellation: true, noiseSuppression: true, channelCount: 2 },
}

export async function getCameraTrack(quality: CallQuality = 'medium'): Promise<MediaStreamTrack> {
    const stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS[quality], audio: false })
    return stream.getVideoTracks()[0]
}

export async function applyVideoQuality(sender: RTCRtpSender, quality: CallQuality) {
    const bitrates: Record<CallQuality, number> = { low: 150_000, medium: 500_000, high: 1_500_000 }
    const params = sender.getParameters()
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}]
    params.encodings[0].maxBitrate = bitrates[quality]
    await sender.setParameters(params)
}

export async function getScreenTrack(): Promise<MediaStreamTrack> {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    return stream.getVideoTracks()[0]
}

export function getVideoSender(pc: RTCPeerConnection): RTCRtpSender | undefined {
    return pc.getSenders().find(s => s.track?.kind === 'video' || s.track === null && s.dtmf === null)
}

export async function renegotiate(
    pc: RTCPeerConnection,
    callId: string,
    peerId: string,
    socket: Socket,
) {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit('call:sdp-offer', { callId, targetUserId: peerId, sdp: offer.sdp })
}

export function addStreamToPeerConnection(pc: RTCPeerConnection, stream: MediaStream) {
    stream.getTracks().forEach(track => pc.addTrack(track, stream))
}

export async function createAndSendOffer(
    pc: RTCPeerConnection,
    callId: string,
    peerId: string,
    socket: Socket,
) {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit('call:sdp-offer', { callId, targetUserId: peerId, sdp: offer.sdp })
}

export async function handleOfferAndSendAnswer(
    pc: RTCPeerConnection,
    sdp: string,
    callId: string,
    peerId: string,
    socket: Socket,
) {
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    socket.emit('call:sdp-answer', { callId, targetUserId: peerId, sdp: answer.sdp })
}

export async function handleAnswer(pc: RTCPeerConnection, sdp: string) {
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
}

export async function addIceCandidate(pc: RTCPeerConnection, candidate: RTCIceCandidateInit) {
    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch {}
}
