# Vertex Voice/Video — Implementation Plan

Phases ordered smallest-to-largest risk. Each phase ships independently and doesn't break existing functionality.

---

## FASE 1 — Signaling base (backend)

**Fitxers nous:**
- `apps/server/src/socket/callHandler.ts` — tots els events de trucada
- `apps/server/src/services/callService.ts` — estat de trucades en memòria/Redis

**Fitxers modificats:**
- `apps/server/src/socket/socketHandler.ts` — registrar callHandler

**Events a implementar (Fase 1):**
```
call:initiate     { targetUserId, callType: 'audio'|'video' }
call:incoming     → envia al receptor
call:accepted     { callId }
call:rejected     { callId }
call:end          { callId }
call:sdp-offer    { callId, targetUserId, sdp }
call:sdp-answer   { callId, targetUserId, sdp }
call:ice-candidate { callId, targetUserId, candidate }
```

**callService:**
```ts
interface ActiveCall {
  id: string
  callerId: string
  calleeId: string
  callType: 'audio' | 'video'
  startedAt: Date
  state: 'ringing' | 'active' | 'ended'
}
```
- `createCall(callerId, calleeId, callType)` → uuid
- `getCall(callId)` → ActiveCall | null
- `endCall(callId)`
- Guardar en Redis (`call:{callId}`, TTL 3600) o Map en memòria

**Validacions:**
- `call:initiate` → comprovar que existeix DM entre els dos usuaris (`socialService.areFriends`)
- `call:sdp-offer/answer/ice-candidate` → comprovar que socket pertany a la trucada
- `call:end` → qualsevol dels dos participants pot tancar

**Entregable:** socket events funcionant, testejables amb Postman/wscat.

---

## FASE 2 — Private voice call (P2P) — frontend

**Fitxers nous:**
- `apps/desktop/src/renderer/src/stores/callStore.ts`
- `apps/desktop/src/renderer/src/utils/webrtc.ts` — helper RTCPeerConnection
- `apps/desktop/src/renderer/src/components/CallOverlay.vue` — UI de trucada activa
- `apps/desktop/src/renderer/src/components/IncomingCallModal.vue` — notificació entrada

**Fitxers modificats:**
- `apps/desktop/src/renderer/src/stores/domain/socketStore.ts` — escoltar events de trucada
- `apps/desktop/src/renderer/src/components/MainLayout.vue` — muntar CallOverlay + IncomingCallModal
- Direct chat header component (si existeix) — botó "Iniciar trucada"

**callStore state:**
```ts
{
  currentCall: ActiveCall | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  callState: 'idle' | 'ringing-out' | 'ringing-in' | 'connecting' | 'active' | 'ended'
  isMuted: boolean
  isVideoOn: boolean
}
```

**webrtc.ts:**
```ts
createPeerConnection(config: RTCConfiguration): RTCPeerConnection
addLocalStream(pc, stream)
handleOffer(pc, sdp) → answer sdp
handleAnswer(pc, sdp)
addIceCandidate(pc, candidate)
```

**STUN config (Fase 2, sense TURN):**
```ts
const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}
```

**Flux complet:**
1. User clica "Call" → `call:initiate` → callStore state = `ringing-out`
2. Receptor rep `call:incoming` → IncomingCallModal
3. Accepta → `call:accepted` → ambdós creen RTCPeerConnection
4. Caller envia SDP offer → receptor respon answer
5. ICE candidates intercanviats via socket
6. `ontrack` event → `remoteStream` al callStore
7. CallOverlay mostra estat "In call", controls mute/end

**CallOverlay UI:**
- Nom de l'altre usuari + estat (Connecting / In call)
- Botó mute mic
- Botó end call
- Timer de durada
- Petit i fixat a cantonada (no modal bloquejant)

**Entregable:** trucada de veu 1:1 funcional entre dos usuaris.

---

## FASE 3 — Camera + screen share (private)

**Fitxers modificats:**
- `apps/desktop/src/renderer/src/utils/webrtc.ts` — `replaceTrack`, `addScreenShare`
- `apps/desktop/src/renderer/src/components/CallOverlay.vue` — botons cam + screen
- `apps/desktop/src/renderer/src/stores/callStore.ts` — `isVideoOn`, `isScreenSharing`

**Nous events socket:**
```
call:video-toggle   { callId, enabled }
call:share-screen   { callId, enabled }
```

**Lògica:**
- Cam: `getUserMedia({ video: true })` → `RTCRtpSender.replaceTrack(videoTrack)`
- Screen: `getDisplayMedia({ video: true })` → afegir com a track extra o substituir vídeo
- En acabar screen share: `track.stop()` → `replaceTrack(cameraTrack)` o `replaceTrack(null)`
- Remote: `ontrack` distingir àudio vs vídeo per `track.kind`

**UI additions a CallOverlay:**
- Botó toggle càmera (📷)
- Botó share screen (🖥)
- Video element per `remoteStream` (si videoOn)
- Previsualització local petita (picture-in-picture)

**Entregable:** trucada vídeo completa + screen share en private call.

---

## FASE 4 — TURN server + robustesa

**Backend (env):**
```
TURN_URL=turn:turn.example.com:3478
TURN_USER=vertex
TURN_PASS=secret
STUN_URL=stun:stun.l.google.com:19302
```

**Frontend:**
```ts
const RTC_CONFIG = {
  iceServers: [
    { urls: process.env.STUN_URL || 'stun:stun.l.google.com:19302' },
    { urls: process.env.TURN_URL, username: process.env.TURN_USER, credential: process.env.TURN_PASS }
  ]
}
```

**Robustesa:**
- Reconnect automàtic si `iceConnectionState === 'failed'`
- Timeout si `ringing` > 30s → `call:end` automàtic
- Netejar MediaStream tracks en `onUnmounted` i `call:end`
- Gestionar cas: l'altre tanca la pàgina sense `call:end` (disconnect socket → tancar trucada)

**Entregable:** trucades estables darrere NAT.

---

## FASE 5 — Channel voice (SFU amb mediasoup)

> **Bloquejant:** requereix `mediasoup` al servidor (Node.js natiu, no servei extern).

**Instal·lació servidor:**
```bash
npm install mediasoup
```

**Fitxers nous:**
- `apps/server/src/services/sfuService.ts` — Worker, Router, Transport management
- `apps/server/src/socket/channelCallHandler.ts`

**Nous events socket:**
```
channel:join-voice    { channelId }
channel:leave-voice   { channelId }
channel:produce       { channelId, kind, rtpParameters }
channel:consume       { channelId, producerId }
channel:producer-closed { producerId }
```

**sfuService:**
```ts
createWorker() → mediasoup.Worker
createRouter(worker) → Router
createWebRtcTransport(router) → Transport
createProducer(transport, kind, rtpParameters) → Producer
createConsumer(router, transport, producer, rtpCapabilities) → Consumer
```

**Flux canal:**
1. User entra canal → `channel:join-voice` → servidor crea Transport
2. User crea Producer (àudio) → servidor registra
3. Servidor envia als altres consumers del canal `channel:new-producer`
4. Clients subscriben al nou producer → reben stream
5. Sortir canal → `channel:leave-voice` → tancar producers/consumers

**Entregable:** trucada de veu en canal de servidor amb múltiples usuaris.

---

## FASE 6 — Channel vídeo + pantalla + UI completa

**Extensions de Fase 5:**
- Producers de vídeo (càmera) i screen share en canals
- Limitar vídeo actiu a 4 participants màxim (resta àudio only)
- UI canal: grid de vídeo participants, indicadors qui parla, mic/cam state

**Nous events socket:**
```
channel:speaking    { userId, speaking: bool }
channel:mute        { userId }
channel:video-on    { userId, enabled }
```

**UI canal:**
- Sidebar mostra participants conectats al canal
- Grid vídeo (màx 4) si vídeo actiu
- Indicadors d'àudio (waveform o border pulsant)
- Controls globals: mute/unmute, cam, screen, leave

---

## Ordre d'execució

| Fase | Prerequisit | Complexitat | Risc |
|------|-------------|-------------|------|
| 1 — Signaling backend | cap | baixa | baix |
| 2 — P2P voice frontend | Fase 1 | mitjana | mig |
| 3 — Cam + screen (private) | Fase 2 | baixa | baix |
| 4 — TURN + robustesa | Fase 2 | baixa | baix |
| 5 — Channel SFU | Fase 1, mediasoup | alta | alt |
| 6 — Channel video UI | Fase 5 | mitjana | mig |

**MVP recomanat:** Fases 1 → 2 → 3 → 4. Canal (5+6) és opcional i separable.

---

## Notes tècniques

- Electron suporta `getUserMedia` i `getDisplayMedia` nativament (Chromium).
- `RTCPeerConnection` funciona sense polyfills en Electron.
- Per Electron, pot calguer `session.setPermissionRequestHandler` per micròfon/càmera.
- `mediasoup` compila natiu (C++) — pot requerir `node-gyp` i build tools al servidor.
- Si Oracle Cloud no té prou CPU per mediasoup Worker, considerar `LiveKit` (servei extern) com a alternativa SFU gestionada.
