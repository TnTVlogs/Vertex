import type { Socket } from 'socket.io-client'

const RTC_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export function createPeerConnection(
    callId: string,
    peerId: string,
    socket: Socket,
    onRemoteStream: (stream: MediaStream) => void,
    onConnectionStateChange: (state: RTCPeerConnectionState) => void,
): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG)

    pc.ontrack = (event) => {
        if (event.streams[0]) onRemoteStream(event.streams[0])
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

    return pc
}

export async function getAudioStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false })
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
