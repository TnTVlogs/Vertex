import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
    createPeerConnection,
    fetchIceServers,
    getAudioStream,
    addStreamToPeerConnection,
    createAndSendOffer,
    handleOfferAndSendAnswer,
    handleAnswer,
    addIceCandidate,
    getCameraTrack,
    getScreenTrack,
} from '../utils/webrtc'
import type { Socket } from 'socket.io-client'
import { useAuthStore } from './authStore'

export type CallState = 'idle' | 'ringing-out' | 'ringing-in' | 'connecting' | 'active' | 'ended'
export type CallType = 'audio' | 'video'

export interface CallInfo {
    callId: string
    callType: CallType
    peerId: string
    peerName: string
}

export const useCallStore = defineStore('call', () => {
    const callState = ref<CallState>('idle')
    const callInfo = ref<CallInfo | null>(null)
    const localStream = ref<MediaStream | null>(null)
    const remoteStream = ref<MediaStream | null>(null)
    const isMuted = ref(false)
    const isVideoOn = ref(false)
    const isScreenSharing = ref(false)
    const pc = ref<RTCPeerConnection | null>(null)
    let cameraTrack: MediaStreamTrack | null = null
    let screenTrack: MediaStreamTrack | null = null

    function reset() {
        callState.value = 'idle'
        callInfo.value = null
        localStream.value?.getTracks().forEach(t => t.stop())
        localStream.value = null
        remoteStream.value = null
        isMuted.value = false
        isVideoOn.value = false
        isScreenSharing.value = false
        cameraTrack?.stop(); cameraTrack = null
        screenTrack?.stop(); screenTrack = null
        pc.value?.close()
        pc.value = null
    }

    function setRemoteStream(stream: MediaStream) {
        remoteStream.value = stream
    }

    function setConnectionState(state: RTCPeerConnectionState) {
        if (state === 'connected') callState.value = 'active'
        if (state === 'failed' || state === 'disconnected' || state === 'closed') reset()
    }

    // Called when we initiate a call
    function onInitiated(callId: string, callType: CallType, peerId: string, peerName: string) {
        callInfo.value = { callId, callType, peerId, peerName }
        callState.value = 'ringing-out'
    }

    // Called when we receive an incoming call
    function onIncoming(callId: string, callType: CallType, callerId: string, callerName: string) {
        if (callState.value !== 'idle') return // already in a call
        callInfo.value = { callId, callType, peerId: callerId, peerName: callerName }
        callState.value = 'ringing-in'
    }

    async function makePC(callId: string, peerId: string, socket: Socket): Promise<RTCPeerConnection> {
        const authStore = useAuthStore()
        const iceServers = await fetchIceServers(authStore.token ?? '')
        return createPeerConnection(callId, peerId, socket, iceServers, setRemoteStream, setConnectionState)
    }

    // Caller: remote accepted → create PC, get stream, send offer
    async function onAccepted(socket: Socket) {
        if (!callInfo.value || callState.value !== 'ringing-out') return
        callState.value = 'connecting'
        const { callId, peerId } = callInfo.value
        try {
            const stream = await getAudioStream()
            localStream.value = stream
            pc.value = await makePC(callId, peerId, socket)
            addStreamToPeerConnection(pc.value, stream)
            await createAndSendOffer(pc.value, callId, peerId, socket)
        } catch {
            reset()
        }
    }

    // Callee: accept incoming call → create PC, get stream, wait for offer
    async function acceptCall(socket: Socket) {
        if (!callInfo.value || callState.value !== 'ringing-in') return
        callState.value = 'connecting'
        const { callId, peerId } = callInfo.value
        socket.emit('call:accepted', { callId })
        try {
            const stream = await getAudioStream()
            localStream.value = stream
            pc.value = await makePC(callId, peerId, socket)
            addStreamToPeerConnection(pc.value, stream)
        } catch {
            reset()
        }
    }

    // Callee: received SDP offer from caller
    async function onSdpOffer(sdp: string, socket: Socket) {
        if (!callInfo.value || !pc.value) return
        const { callId, peerId } = callInfo.value
        await handleOfferAndSendAnswer(pc.value, sdp, callId, peerId, socket)
    }

    // Caller: received SDP answer from callee
    async function onSdpAnswer(sdp: string) {
        if (!pc.value) return
        await handleAnswer(pc.value, sdp)
    }

    // Either side: ICE candidate received
    async function onIceCandidate(candidate: RTCIceCandidateInit) {
        if (!pc.value) return
        await addIceCandidate(pc.value, candidate)
    }

    function toggleMute() {
        if (!localStream.value) return
        const enabled = !isMuted.value
        localStream.value.getAudioTracks().forEach(t => { t.enabled = !enabled })
        isMuted.value = enabled
    }

    async function toggleCamera(socket: Socket) {
        if (!pc.value || !callInfo.value) return
        const { callId, peerId } = callInfo.value

        if (isVideoOn.value) {
            const sender = pc.value.getSenders().find(s => s.track?.kind === 'video')
            if (sender) await sender.replaceTrack(null)
            cameraTrack?.stop(); cameraTrack = null
            isVideoOn.value = false
            socket.emit('call:video-toggle', { callId, enabled: false })
        } else {
            try {
                const track = await getCameraTrack()
                cameraTrack = track
                const sender = pc.value.getSenders().find(s => s.track?.kind === 'video')
                if (sender) {
                    await sender.replaceTrack(track)
                } else {
                    pc.value.addTrack(track, localStream.value!) // onnegotiationneeded fires automatically
                }
                isVideoOn.value = true
                socket.emit('call:video-toggle', { callId, enabled: true })
            } catch { /* user denied or no camera */ }
        }
    }

    async function toggleScreenShare(socket: Socket) {
        if (!pc.value || !callInfo.value) return
        const { callId } = callInfo.value

        if (isScreenSharing.value) {
            const sender = pc.value.getSenders().find(s => s.track?.kind === 'video')
            if (sender) await sender.replaceTrack(cameraTrack ?? null)
            screenTrack?.stop(); screenTrack = null
            isScreenSharing.value = false
            isVideoOn.value = !!cameraTrack
            socket.emit('call:share-screen', { callId, enabled: false })
        } else {
            try {
                const track = await getScreenTrack()
                screenTrack = track
                track.onended = () => toggleScreenShare(socket)
                const sender = pc.value.getSenders().find(s => s.track?.kind === 'video')
                if (sender) {
                    await sender.replaceTrack(track)
                } else {
                    pc.value.addTrack(track, localStream.value!) // onnegotiationneeded fires automatically
                }
                isScreenSharing.value = true
                socket.emit('call:share-screen', { callId, enabled: true })
            } catch { /* user cancelled screen picker */ }
        }
    }

    function endCall(socket: Socket) {
        if (callInfo.value) {
            socket.emit('call:end', { callId: callInfo.value.callId })
        }
        reset()
    }

    function rejectCall(socket: Socket) {
        if (callInfo.value) {
            socket.emit('call:rejected', { callId: callInfo.value.callId })
        }
        reset()
    }

    return {
        callState, callInfo, localStream, remoteStream, isMuted, isVideoOn, isScreenSharing,
        reset, onInitiated, onIncoming, onAccepted, acceptCall,
        onSdpOffer, onSdpAnswer, onIceCandidate,
        toggleMute, toggleCamera, toggleScreenShare, endCall, rejectCall,
    }
})
