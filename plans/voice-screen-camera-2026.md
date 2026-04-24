# Arquitectura per afegir xat de veu, pantalla i càmera a Vertex — Abril 2026

## Objectiu

Afegir trucades de veu i vídeo entre dos usuaris a xats privats, i trucades de grup en canals de servidor. Inclou compartir pantalla i càmera. Private calls = P2P, server calls = media broker / SFU.

---

## Visió general

- Private chat: WebRTC peer-to-peer per àudio/vídeo/screenshare entre dos usuaris.
- Server channel call: servidor actua com a forwarding unit (SFU) per múltiples usuaris.
- Signaling via Socket.io ja existent.
- Media: `getUserMedia`, `getDisplayMedia`, `RTCPeerConnection`.
- NAT traversal amb TURN/STUN.
- Control d'accés: només membres del canal poden unir-s'hi.

---

## Components principals

### 1. Signaling

Usar Socket.io per negociar WebRTC.

Events mínims:
- `call:initiate` (private) → crea trucada, envia a receptor.
- `call:join-channel` (channel) → user vol entrar a trucada de canal.
- `call:sdp-offer` / `call:sdp-answer`
- `call:ice-candidate`
- `call:end`
- `call:mute` / `call:unmute` / `call:video-toggle` / `call:share-screen`

Server valida token i membres.

### 2. Private call P2P

Arquitectura:
- Caller inicia `call:initiate` amb `targetUserId` i tipus de trucada.
- Server envia `call:incoming` a target.
- Receptor accepta → servidor envia `call:accepted`.
- Ambdós creen `RTCPeerConnection` local.
- Cada banda envia SDP offer/answer i candidats ICE.
- Track local:
  - àudio: `getUserMedia({ audio: true })`
  - càmera: `getUserMedia({ audio: true, video: true })`
  - pantalla: `getDisplayMedia({ video: true })`
- Mida de flux: `pc.addTrack(track, stream)`.
- En acabar: `pc.close()`, `call:end`.

Benefici:
- baix latència.
- no pas de media pel servidor.
- escalable per trucades 1:1.

Limitacions:
- no funciona bé si 2 NATs molt agressius sense TURN.
- no adequat per >2 usuaris.

### 3. Canal call amb servidor

Per canal de servidor, no fer full mesh. Usar SFU.

Opcions:
- `mediasoup` node.
- `Janus` o `Pion` si cal.
- Solució minimal: router server que rep tracks i els envia a subscriptors.

Flux:
- Usuari entra a canal i crea `Producer` local (àudio/video/screen).
- Server crea `Transport` / `RTP capabilities` per usuari.
- User envia offer, server genera answer.
- Server fa fanout de streams entrants a clients connectats.
- Clients reben només fluxos necessaris.

Regles:
- Canal call només per membres de server.
- Permetre un nombre limitat de participants actius de vídeo.
- Òptim: àudio de tots, vídeo de fins 4 participants per pantalla.

### 4. Compartir pantalla i càmera

- Pantalla: `navigator.mediaDevices.getDisplayMedia({ video: true })`.
- Càmera: `navigator.mediaDevices.getUserMedia({ audio: true, video: true })`.
- Permetre swap de track en la mateixa PeerConnection.
- Si ja hi ha àudio/càmera, afegir track de screen share com stream extra o substituir vídeo.
- En `call:end` restaurar controls i aturar tracks amb `track.stop()`.

---

## Detalls d'implementació

### Backend

1. `callService` per gestionar sessions de trucada.
2. `socket/call.ts` middleware per auth i permisos.
3. Lògica private call:
   - crear objecte `activeCalls` en memòria o Redis.
   - registrar `callerId`, `calleeId`, `callType`, `startedAt`.
4. Lògica channel call:
   - `channelCallRooms[channelId]` amb clients actius.
   - validar `serverService.isMember(userId, channelId)`.
5. Necessari TURN:
   - `TURN_URL`, `TURN_USER`, `TURN_PASS` a env.
   - `STUN_URL` opcional.
6. Protecció:
   - `call:initiate` només per xats privats existents.
   - `call:join-channel` només per membres de canal.
   - no acceptar `call:sdp-offer` de qui no està en trucada.

### Frontend

1. UI botó `Call` a xat privat i `Join voice` a canal.
2. Modal/overlay de trucada amb:
   - botons mute mic, toggle cam, share screen, end call.
   - estat `Connecting`, `In call`, `Ringing`.
3. `callStore` amb estat: `currentCall`, `localStream`, `remoteStream`, `callType`, `peers`.
4. Crear WebRTC helper:
   - `createPeerConnection(targetId)`.
   - `handleTrackEvent(event)`.
   - `sendIceCandidate(targetId, candidate)`.
5. Gestionar reconexió i errors.
6. En canal call, UI mostra participants i el seu estat.

### UX

Private call:
- clic a `Voice/Video call` en direct chat.
- receptor veu notificació `Incoming call`.
- accepta / rebutja.
- si accepta, arrenca media i connecta P2P.
- freeze local si no accepta.

Channel call:
- botó `Join voice channel` en barra lateral.
- el canal s'uneix a sala de veu del servidor.
- mostrar qui parla i qui té mic/cam activa.
- compartir pantalla com a stream addicional.

### Authorization i estats

- `CALL_INVITE`, `CALL_ACCEPTED`, `CALL_REJECTED`, `CALL_ENDED`, `USER_JOINED`, `USER_LEFT`.
- En canal: `USER_SPEAKING`, `USER_MUTED`, `USER_VIDEO_ON`, `USER_SCREEN_ON`.
- Guardar estat local i mostrar en UI.

---

## Consideracions de rendiment

- Private calls: usar P2P només 1:1.
- Channel calls: SFU evita full mesh.
- Limitar vídeo multiple en canal per reduir CPU/banda.
- Si `screen-share` és actiu, opcionalment mutear vídeo de càmera per estalviar bitrate.
- Controls de banda: `RTCRtpSender.setParameters()` per reduir resolució/bitrate.

---

## Riscos i recomanacions

- Sense TURN, P2P pot fallar en NAT restrictiu.
- Servidor SFU aporta complexitat i cost.
- Evitar MCU per ara; millor SFU per escalar.
- Provar en entorn Electron i en navegador.
- Començar amb MVP de `àudio-only` en canal, després afegir vídeo/pantalla.

---

## Roadmap d'implementació

1. Afegir signaling base per private call.
2. Implementar P2P private voice/audio.
3. Afegir camera toggle i screen-share private.
4. Crear servidor de forwarding per canal voice.
5. Integrar vídeo i pantalla en canal.
6. Afegir controls de mute/permissions.
7. Provar amb TURN i security checks.

Aquest document guia afegir funcionalitat de trucades en Vertex sense trencar arquitectura existent.
