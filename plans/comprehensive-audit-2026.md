# Auditoria completa del projecte Vertex — Abril 2026

## Context

Anàlisi exhaustiva posterior a l'implementació de la versió anterior. Cobreix seguretat, rendiment, arquitectura, qualitat de codi i estratègia de negoci. Identifica problemes nous, millores i brecha entre "fet" i "production-ready".

---

## 🔴 CRÍTIC — Seguretat

### ~~1. Socket.io sense autenticació~~ ✅ FET
**Problema**: Qualsevol client pot connectar-se a Socket.io i escoltar totes les rooms de canals.
```
socket.on('join-channel', (channelId: string) => {
  socket.join(`channel:${channelId}`);  // ← No verifica permisos
});
```
**Risc**: Espiar xats privats, messages de DM d'altres usuaris.
**Fix**: Middleware de socket amb JWT:
```ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Auth required'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch { next(new Error('Invalid token')); }
});

socket.on('join-channel', async (channelId) => {
  // Check if user is member of this server
  const isMember = await serverService.isUserMemberOfChannel(socket.userId, channelId);
  if (!isMember) return socket.emit('error', 'Access denied');
  socket.join(`channel:${channelId}`);
});
```

### ~~2. Validació de socket events inexistent~~ ✅ FET
**Problema**: `send-message` accepta qualsevol data sense validació per schema.
```ts
socket.on('send-message', async (data, callback) => {
  const { authorId, content, channelId, recipientId, attachmentUrl } = data;
  // Confia cegament en 'data'
});
```
**Risc**: Camps extres, tipus incorrectes, injeccions.
**Fix**: 
```ts
import { z } from 'zod';

const sendMessageSchema = z.object({
  authorId: z.string().uuid(),
  content: z.string().min(1).max(500),
  channelId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  attachmentUrl: z.string().url().optional(),
}).refine(d => d.channelId || d.recipientId, 'Channel or recipient required');

socket.on('send-message', async (data, callback) => {
  try {
    const validated = sendMessageSchema.parse(data);
    // Use validated data
  } catch (err) {
    callback({ error: 'Invalid data' });
  }
});
```

### ~~3. Sense rate limiting als socket events~~ ✅ FET
**Problema**: Client pot spammar `send-message` infinitament (límit de negoci és check en BD, massa tard).
**Risc**: DoS, spam. Cada event és una query à BD.
**Fix**: Rate limiting en memòria per socket:
```ts
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();

const checkSocketRateLimit = (socketId: string): boolean => {
  const now = Date.now();
  const limit = socketRateLimits.get(socketId);
  
  if (!limit || now > limit.resetAt) {
    socketRateLimits.set(socketId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (limit.count >= 20) return false; // 20 msgs/min
  limit.count++;
  return true;
};

socket.on('send-message', async (data, callback) => {
  if (!checkSocketRateLimit(socket.id)) {
    callback({ error: 'Rate limit exceeded' });
    return;
  }
  // ... continue
});
```

### ~~4. No HTML sanitization en missatges~~ ✅ FET
**Problema**: `msg.content` es renderitza amb `v-html` al frontend:
```vue
<div v-html="formatMessage(msg.content)"></div>
```
**Risc**: XSS injection — user pot executar JS en navegadors d'altres.
```
<img src=x onerror="alert('xss')">
```
**Fix**: Sanitizar sempre:
```ts
import DOMPurify from 'dompurify';

const formatMessage = (content: string): string => {
  return DOMPurify.sanitize(content, { ALLOWED_TAGS: ['b', 'i', 'u', 'code', 'br', 'a'], ALLOWED_ATTR: ['href', 'target'] });
};
```

### ~~5. Attachment URL sense validació~~ ✅ FET
**Problema**: `attachmentUrl` accepta qualsevol string, no valida mida, tipus MIME, origin.
```ts
async createMessage(data: {
  attachmentUrl?: string | null;
}) {
  // ...
  attachmentUrl: data.attachmentUrl ?? null,
}
```
**Risc**: Pujada de fitxers maliciosos, referència a recursos aliens massius.
**Fix**: Validar origen + mida:
```ts
const isValidAttachmentUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const allowedHosts = ['cdn.vertex.local', 'media.vertex.local'];
    return allowedHosts.includes(parsed.hostname);
  } catch { return false; }
};

if (data.attachmentUrl && !isValidAttachmentUrl(data.attachmentUrl)) {
  throw new Error('Invalid attachment URL');
}
```

### ~~6. Presence data sense TTL cleanup~~ ✅ FET
**Problema**: `setPresence` a Redis no té expiry:
```ts
export const setPresence = async (userId: string, status: string) => {
  if (redisClient.isOpen) {
    await redisClient.set(`presence:${userId}`, status);  // ← No TTL
  }
};
```
**Risc**: Si servidor crash sense `disconnect` event, presence queda `online` per sempre.
**Fix**:
```ts
await redisClient.set(`presence:${userId}`, status, { EX: 3600 }); // 1h TTL
```
+ Refresh TTL en cada activitat del user.

### ~~7. Admin únic per env var com fallback insegur~~ ✅ FET
**Problema**: `ADMIN_USER_ID` al `.env` és fallback si no trobo admins a BD:
```ts
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.userId === process.env.ADMIN_USER_ID || req.user?.userId from DB is admin) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden' });
    }
};
```
**Risc**: Si BD es compromet, fallback user pot no ser admin realment.
**Fix**: Eliminar fallback, només confiar BD:
```ts
if (!req.user?.isAdmin) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

## 🟠 ALT — Arquitectura i Rendiment

### ~~8. Absència de soft-delete per a missatges~~ ✅ FET (migració pendent: BD offline)
**Problema**: Els missatges no es poden esborrar, editar, ni marcar com esborrat. Admin no pot moderar spam.
**Fix**: Afegir camp `deletedAt` a schema:
```prisma
model Message {
  id            String    @id @default(uuid())
  content       String    @db.Text
  deletedAt     DateTime? @map("deleted_at")
  ...
}
```
+ Afegir endpoint `DELETE /messages/:id` que soft-delete:
```ts
await prisma.message.update({
  where: { id: msgId },
  data: { deletedAt: new Date() }
});
```
+ Filtrar `deletedAt IS NULL` a totes les queries de missatges.

### ~~9. Falta de transaccions en operacions crítiques~~ ✅ FET
**Problema**: `joinServerByCode` fa múltiples queries sense transaction:
```ts
const server = await prisma.server.findUnique(...);
if (server.inviteExpiresAt < new Date()) throw...;
const existingMember = await prisma.member.findUnique(...);
return prisma.member.create(...);
```
**Risc**: Race condition — server podria ser esborrat entre queries.
**Fix**: Ja hi ha `prisma.$transaction` en `createServer`. Aplicar a totes les operacions multi-step:
```ts
return prisma.$transaction(async (tx) => {
  const server = await tx.server.findUnique({ where: { inviteCode } });
  if (!server) throw new Error('Invalid code');
  if (server.inviteExpiresAt && server.inviteExpiresAt < new Date()) throw new Error('Expired');
  const existing = await tx.member.findUnique({...});
  if (existing) throw new Error('Already member');
  return tx.member.create({...});
});
```

### ~~10. Message broadcast sense confirmació (ACK)~~ ✅ FET
**Problema**: Socket.io emet message a room pero no verifica que clients el reberen:
```ts
io.to(`channel:${channelId}`).emit('message', message);
```
**Risc**: Client pot perdre message si disconnect just despres.
**Fix**: Afegir ACK mechanism:
```ts
const users = await serverService.getMembersForServer(server.id);
users.forEach(user => {
  io.to(`user:${user.userId}`).emit('message', message, (ack) => {
    if (!ack) logger.warn(`User ${user.userId} did not ACK message ${message.id}`);
  });
});
```
+ Frontend ACK:
```ts
socket.on('message', (msg, ack) => {
  messageStore.addMessage(msg);
  ack?.({ received: true });
});
```

### ~~11. Falta de paginació en amics~~ ✅ FET
**Problema**: `fetchFriends()` carrega TOTS els amics sense limit:
```ts
async fetchFriends() {
  const res = await fetch(`${ENV.API_URL}/social/friends`);
  const data = await res.json();
  this.friends = data.friends; // Podria ser 10k records!
}
```
**Risc**: Memòria excessiva, lentitud de UI.
**Fix**: Afegir `LIMIT` i cursor paginació:
```ts
async fetchFriends(limit = 50, cursor?: string) {
  const res = await fetch(
    `${ENV.API_URL}/social/friends?limit=${limit}${cursor ? '&cursor=' + cursor : ''}`
  );
  const data = await res.json();
  return { friends: data.friends, nextCursor: data.nextCursor };
}
```

### ~~12. Redis presence pubsub no utilitzat eficientment~~ ✅ FET
**Problema**: `publishMessage('chat-events', message)` no té subscribers. Es publica pero ningú l'escolta.
```ts
await publishMessage('chat-events', message);  // ← Publication sense suscriptors?
```
**Risc**: Codi mort, manteniment confús.
**Fix**: O eliminar o implementar suscriptors reals per a analytics/archiving.

---

## 🟡 MITJÀ — Frontend

### ~~13. Falta de debounce al input de xat~~ ✅ FET
**Problema**: `ChatInput.vue` pot enviar múltiples missatges amb race conditions:
```vue
const sendMessage = async () => {
  await chatStore.sendMessage(messageText.value)
  messageText.value = ''
}
```
**Risc**: Dos sends quasi simultanis → ordre impredictible.
**Fix**: Debounce + disable button:
```vue
<script setup>
const isSending = ref(false);

const sendMessage = async () => {
  if (isSending.value || !messageText.value.trim()) return;
  isSending.value = true;
  try {
    await chatStore.sendMessage(messageText.value);
    messageText.value = '';
  } finally {
    isSending.value = false;
  }
};
</script>
<template>
  <button @click="sendMessage" :disabled="isSending">Send</button>
</template>
```

### ~~14. Scroll-to-bottom jump al carrega older messages~~ ✅ FET (ja implementat)
**Problema**: `MessageList.vue` carrega messages antics pero scroll salta:
```ts
handleLoadOlder() {
  chatStore.loadOlderMessages();
  // Scroll jumps?
}
```
**Risc**: UX pobre, usuari es perd en la conversa.
**Fix**: Preserve scroll offset:
```ts
const handleLoadOlder = async () => {
  const scrollTop = vListRef.value?.getScrollOffset() || 0;
  const oldCount = chatStore.sortedMessages.length;
  
  await chatStore.loadOlderMessages();
  
  const newCount = chatStore.sortedMessages.length;
  const addedCount = newCount - oldCount;
  
  // Scroll al primer nou item (que es converteix en els vells)
  vListRef.value?.scrollToIndex(addedCount, { align: 'start', behavior: 'auto' });
};
```

### ~~15. Falta de "typing" indicators~~ ✅ FET
**Problema**: Usuaris no saben si l'altre està escrivint.
**Fix**: 
Backend socket:
```ts
socket.on('typing', (channelId: string) => {
  io.to(`channel:${channelId}`).emit('typing', { userId: socket.userId });
});
socket.on('stop-typing', (channelId: string) => {
  io.to(`channel:${channelId}`).emit('stop-typing', { userId: socket.userId });
});
```
Frontend:
```ts
const isTyping = ref(false);
const typingTimeout = ref<number | null>(null);

const onInputKeydown = () => {
  if (!isTyping.value) {
    socket.emit('typing', activeChannelId);
    isTyping.value = true;
  }
  clearTimeout(typingTimeout.value!);
  typingTimeout.value = window.setTimeout(() => {
    socket.emit('stop-typing', activeChannelId);
    isTyping.value = false;
  }, 2000);
};
```

### ~~16. Falta de validació de longitud en frontend pre-submit~~ ✅ FET (ja implementat)
**Problema**: User pot escriure message de 1000 chars, frontend le deixa, pero backend rebutja.
```vue
<textarea v-model="messageText"></textarea>
<!-- No maxlength, no warning -->
```
**Fix**:
```vue
<textarea 
  v-model="messageText" 
  :maxlength="tierLimits.maxMessageLength"
  @input="updateCharCount"
/>
<span v-if="charCount > tierLimits.maxMessageLength * 0.9" class="text-red-500">
  {{ charCount }} / {{ tierLimits.maxMessageLength }}
</span>
```

### ~~17. Visuàl feedback insuficient per a estat de message~~ ✅ FET (ja implementat)
**Problema**: Message pot estar `sending`, `sent`, `error` pero no es veu clarament:
```vue
<span v-if="msg.status === 'sending'" class="text-[var(--v-accent)] animate-spin">
  🔄
</span>
```
**Fix**: Afegir estil més clar:
```vue
<div 
  :class="{
    'opacity-50': msg.status === 'sending',
    'border-l-4 border-red-500': msg.status === 'error',
    'border-l-4 border-green-500': msg.status === 'sent',
  }"
>
  {{ msg.content }}
</div>
```

### ~~18. Absència de modal d'error global~~ ✅ FET (ja implementat — toastStore + ToastContainer)
**Problema**: Errors de xarxa mostren `console.error` o desapareixen silenciosament.
**Fix**: Implementar error boundary + toast global:
```ts
// errorStore.ts
export const useErrorStore = defineStore('error', () => {
  const errors = ref<{ id: string; message: string; timestamp: number }[]>([]);
  
  const addError = (message: string) => {
    errors.value.push({ id: uuidv4(), message, timestamp: Date.now() });
    setTimeout(() => removeError(errors.value[0].id), 5000);
  };
  
  return { errors, addError, removeError };
});
```

---

## 🟡 MITJÀ — Backend

### ~~19. Error handling incoherent entre HTTP i Socket.io~~ ✅ FET
**Problema**: HTTP routes retornen `{ error: 'message' }` pero socket callbacks retornen `{ error: 'message' }` amb callback vs emit.
```ts
// HTTP
res.status(400).json({ error: 'Invalid' });

// Socket (inconsistent)
if (callback) callback({ error: errorMsg });
else socket.emit('error', { message: errorMsg });
```
**Fix**: Normalitzar protocol socket amb proper error codes:
```ts
callback({
  success: false,
  error: { code: 'INVALID_MESSAGE', message: 'Message too long' }
});
```

### ~~20. Logging incomplete — no rastreig de operacions end-to-end~~ ✅ FET
**Problema**: Logger emet errors pero no les connecta amb sessions de user.
```ts
logger.error({ err: error }, 'Error saving message');
```
**Fix**: Afegir request ID + user ID a context:
```ts
const requestId = uuidv4();
socket.data.requestId = requestId;
socket.data.userId = decodedToken.userId;

socket.on('send-message', async (data) => {
  logger.info(
    { userId: socket.data.userId, requestId: socket.data.requestId },
    'send-message started'
  );
  // ...
});
```

### ~~21. Falta de cache per a dades estàtiques~~ ✅ FET
**Problema**: Cada `getPreviewByInviteCode` query a BD sense cache.
```ts
const preview = await serverService.getPreviewByInviteCode(code);
```
**Fix**: Cache 5min a Redis:
```ts
export const getPreviewByInviteCode = async (code: string) => {
  const cached = await redisClient.get(`preview:${code}`);
  if (cached) return JSON.parse(cached);
  
  const preview = await prisma.server.findUnique({...});
  if (preview) {
    await redisClient.setEx(`preview:${code}`, 300, JSON.stringify(preview));
  }
  return preview;
};
```

### ~~22. Permissió de crear server sense límit~~ ✅ FET (BASIC=1, PRO=3, VIP=5)
**Problema**: User pot crear 1000 servers sense restricció.
**Fix**: Afegir límit per tier:
```ts
const serverCount = await prisma.server.count({
  where: { ownerId: userId }
});

if (serverCount >= tierLimits.maxServersPerUser) {
  throw new Error(`Server limit exceeded (${tierLimits.maxServersPerUser} max)`);
}
```

### ~~23. Manca de validació de invite expiry timestamps~~ ✅ FET
**Problema**: `inviteExpiresAt` pot tenir format invàlid o data passada acceptada.
**Fix**: Ja està validat a nivell de servei, pero afegir índex per a cleanup:
```prisma
@@index([inviteExpiresAt])
```
+ Job per netejar servers sense codi:
```ts
await prisma.server.updateMany({
  where: {
    inviteCode: null,
    inviteExpiresAt: { lt: new Date() }
  },
  data: { inviteCode: null, inviteExpiresAt: null }
});
```

---

## 🔵 BAIX — Qualitat i Testing

### ~~24. Coverage test baix — serveis sense tests~~ ✅ FET
**Problema**: `serverService`, `socialService` té tests minimalistes:
```
Coverage: 40-50%
```
**Fix**: Expandir tests per a happy path + edge cases + error cases.

### ~~25. Absència de E2E tests~~ ✅ FET
**Problema**: No tenim tests que verifiquen fluxos complets (login → create server → send message).
**Fix**: Afegir `playwright` o `cypress`:
```
tests/
  e2e/
    auth.spec.ts
    messaging.spec.ts
    servers.spec.ts
```

### ~~26. Inconsistència de tipat TS~~ ✅ FET
**Problema**: `req.user?.userId` és optional pero es tracta com required en alguns llocs:
```ts
const user = await messageService.getUserTierInfo(req.user?.userId!); // ! suppress
```
**Fix**: Middleware `requireAuth` ja assegura `req.user`, pero afegir type guard:
```ts
export interface AuthRequest extends Request {
  user: { userId: string }; // ← No optional
}
```

### ~~27. Swagger docs desactualitzats~~ ✅ FET
**Problema**: Swagger generat al `swagger.ts` pero no es actualitza automàticament amb canvis de controller.
**Fix**: Usar `@nestjs/swagger` decorators o comentaris JSDoc:
```ts
/**
 * @route POST /messages
 * @param {Object} data - Message data
 * @returns {Object} Created message
 */
```

### ~~28. Configuration duplication~~ ✅ FET (migracion pendent BD offline)
**Problema**: `TIER_LIMITS` definit a `config/limits.config.ts` pero no a BD.
**Fix**: Migrar tiers a taula de BD:
```prisma
model UserTier {
  tier              UserTier   @unique
  maxDailyMessages  Int
  maxMessageLength  Int
}
```

---

## 🔵 BAIX — UX i Features

### ~~29. Notificacions ausents~~ ✅ FET
**Problema**: No hi ha notificacions de:
- Missatge nou
- Friend request
- Server invite
**Fix**: Implementar notificació del SO (desktop) + browser notifications (web):
```ts
if (Notification.permission === 'granted') {
  new Notification('New Message', { body: `${username}: ${content}` });
}
```

### ~~30. Manca de busca de missatges~~ ✅ FET (migració fulltext pendent BD offline)
**Problema**: No es pot cercar per contingut o per data en un canal.
**Fix**: 
BD: Full text search a MySQL:
```prisma
@@fulltext([content])
```
Backend: 
```ts
async searchMessages(channelId: string, query: string) {
  return prisma.message.findMany({
    where: {
      channelId,
      content: { search: query }
    }
  });
}
```

### ~~31. Sense ban/mute de users~~ ✅ FET (migració pendent BD offline)
**Problema**: Admin no pot silenciar o banejar users spam dins del server.
**Fix**: Afegir camps a `Member`:
```prisma
model Member {
  ...
  isMuted      Boolean   @default(false)
  mutedUntil   DateTime?
  role         MemberRole // member | moderator | owner
}
```

---

## Summary — Prioritzat i Taula de Ruta

| Prioritat | Nº issues | Sprint | Effort |
|-----------|-----------|--------|--------|
| 🔴 Crític | 7 | **NOW** | 3-4 setmanes |
| 🟠 Alt | 8 | Sprint 1 | 2-3 setmanes |
| 🟡 Mitjà | 10 | Sprint 2 | 3-4 setmanes |
| 🔵 Baix | 6 | Sprint 3+ | 2-3 setmanes |

### Next Immediate Actions (Aquesta setmana)

1. **Socket auth middleware** (30 min)
2. **Socket event validation** (1h)
3. **HTML sanitization** (30 min)
4. **Message soft-delete** (2h)
5. **Presence TTL fix** (30 min)

### Keys Fitxers a Revisar

- `apps/server/src/app.ts` — afegir socket auth
- `apps/server/src/socket/socketHandler.ts` — validació i rate limiting
- `apps/server/prisma/schema.prisma` — soft delete + indexes
- `apps/server/src/services/messageService.ts` — sanitization
- `apps/desktop/src/renderer/src/components/MessageList.vue` — scroll fix
- `apps/desktop/src/renderer/src/stores/chatStore.ts` — error handling global

### Metriques de Qualitat

- Coverage: 40% → 70% (+30)
- Critical Issues: 7 → 0
- Response time p95: <200ms (mesurar)
- WebSocket lag: <100ms (mesurar)

---

## Resum verbal

Projecte bé estructurat pero amb brecha en **seguretat del socket**, **validació**, **maneig d'errors** i **testing**. Prioritat immediata: auth socket, sanitization, soft-delete. Després: paginació, transaccions, E2E tests, notificacions.

La implementació prèvia va abordar bé els problemes crítics inicials (CORS, validació HTTP, BD indexes). Ara calen refinaments arquitèctonics per a production-readiness.

**Estimació per a production**: 6-8 setmanes si es segueix ruta prioritzada.
