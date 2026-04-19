# Auditoria completa del projecte Vertex

## Context

Anàlisi exhaustiva del projecte Vertex (aplicació de xat tipus Discord) per identificar problemes, vulnerabilitat i àrees de millora. Cobreix backend (Express + Prisma + MariaDB), frontend (Vue 3 + Electron + Pinia) i infraestructura.

---

## 🔴 CRÍTIC — Seguretat

### ~~1. CORS completament obert~~ ✅ FET
- Afegit `ALLOWED_ORIGINS` a `.env`
- `index.ts` ara valida origin per HTTP i Socket.io (Electron sense origin passa)

### ~~2. Sense validació d'input als controladors~~ ✅ FET
- Instal·lat `zod@4`
- Creat `middleware/validate.ts` (factory genèric)
- Creat `middleware/schemas.ts` (schemas per auth, social, servers)
- Aplicat a totes les rutes POST/PUT rellevants

### ~~3. Sense límit de velocitat al login/registre~~ ✅ FET
- Instal·lat `express-rate-limit`
- Login: 5 intents / 15 min per IP
- Registre: 3 intents / hora per IP

### ~~4. JWT secret és un placeholder~~ ✅ SOLUCIONAT PER L'USUARI
- El servidor de producció ja té una clau aleatòria forta
- El `.env` local és exemple — al `.gitignore`

---

## 🔴 CRÍTIC — Base de Dades i Rendiment

### ~~5. Índexos crítics falten~~ ✅ FET
- `@@index([registrationIp])` a User
- `@@index([channelId, createdAt])` a Message (query principal de canal)
- `@@index([authorId, createdAt])` a Message (comptador diari)
- FK indexes (channel_id, author_id, etc.) ja existien via InnoDB

### ~~6. Missatges sense LIMIT — perill real~~ ✅ FET
- Backend: `ORDER BY created_at DESC LIMIT 50` per defecte, cursor `before=<ISO>` per paginació
- Frontend: `messageStore` amb `hasMore` + `loadOlderMessages()`
- Chat.vue: botó "↑ Load older messages" que preserva scroll position

### ~~7. N+1 queries a la llista de servidors~~ ✅ FET
- `getServersForUser` ja no carrega `members`
- Nou endpoint `GET /servers/:serverId/members`
- `serverStore.fetchMembers()` + `serverStore.members[]`
- `ServerSettingsModal` carrega membres només en obrir la pestanya "Members"

---

## 🟠 ALT — Arquitectura Backend

### ~~8. Dos patrons d'accés a BD mesclats~~ ✅ FET
- CLI actualitzat a v7.7.0 (sincronitzat amb `@prisma/client@7.7.0`)
- `prisma generate` regenerat correctament
- **Migrats a Prisma**: `authService`, `adminService`, `socialService`, `messageService`, `requireActive`, `checkMessageLimits`
- `db.ts` (mysql2 raw) ja no té importadors en els serveis principals
- `prisma.ts` netejat (eliminats `console.log` de debug)

### ~~9. Lògica de negoci dins del socket handler~~ ✅ FET
- `messageService.createMessage()` — INSERT + fetch d'autor en un sol lloc
- `messageService.getUserTierInfo()` — lookup de status/tier
- `socketHandler.ts` ara és purament orquestrador (crida serveis, no fa queries)

### ~~10. Sense logging estructurat~~ ✅ FET
- Instal·lat `pino` + `pino-pretty` (dev) / JSON (prod)
- `src/utils/logger.ts` — logger central
- Tots els controladors i el socket handler usen `logger.error/info`

### ~~11. Errors exposen internals al client~~ ✅ FET
- Tots els catch blocks: `logger.error({ err }, ...)` + `res.status(500).json({ error: 'Internal server error' })`
- Errors de negoci (4xx) continuen retornant missatge descriptiu
- Errors de DB/sistema ja no arriben al client

### ~~12. Sense middleware de seguretat~~ ✅ FET
- `helmet()` — X-Frame-Options, X-Content-Type-Options, HSTS, etc.
- `compression()` — gzip per a totes les respostes HTTP

### ~~13. Cap validació d'env vars a l'inici~~ ✅ FET
- `src/config/env.ts` — schema Zod sobre `process.env`
- Importat al primer `import` de `index.ts` → `process.exit(1)` amb missatge clar si falta alguna variable

---

## 🟠 ALT — Base de Dades

### ~~14. Sense enums al schema de Prisma~~ ✅ FET
- Afegits `UserStatus`, `UserTier`, `ChannelType`, `MemberRole`, `FriendRequestStatus`
- `adminService` usa `as UserStatus / UserTier` per conservar validació runtime
- `prisma generate` regenerat sense errors TS

### ~~15. Message pot ser orfe~~ ✅ FET
- `messageService.createMessage()` llença error si ni `channelId` ni `recipientId` present
- Cobreix tant rutes HTTP com socket

### ~~16. Friendship pot tenir duplicats invertits~~ ✅ FET (capa servei)
- `socialService` ja ordena amb `.sort()` a `areFriends` i `createFriendship`
- Únic constraint a BD (`@@unique([user1Id, user2Id])`) prevé duplicats si el servei ordena
- Nota: CHECK `user1_id < user2_id` a nivell BD requeriria migració manual (MySQL 8.0.16+)

### ~~17. Invitació de servidor sense caducitat~~ ✅ FET
- Afegit `inviteExpiresAt DateTime?` al model `Server`
- `generateInvite(serverId, expiresInDays)` — per defecte 7 dies, `null` = mai
- `joinServerByCode` i `getPreviewByInviteCode` validen caducitat → error clar
- `InvitePreview.vue` mostra badge "Expires in Xd Yh"
- `ServerSettingsModal.vue` selector 1d/7d/30d/Mai + badge color-coded al link actiu

---

## 🟡 MITJÀ — Frontend (Vue + Pinia)

### ~~18. Components massa grans~~ ✅ FET
- Extret `ChatInput.vue` (input + emoji picker + char counter)
- Extret `MessageList.vue` (llista + load older + skeletons) — exposa `scrollToBottom()`
- Extret `FriendsView.vue` (online/all + pending tabs)
- `Chat.vue` reduït a ~35 línies (composició pura)
- `MainLayout.vue` reduït ~100 línies

### ~~19. Sense Vue Router — navegació manual~~ ✅ FET
- Instal·lat `vue-router@4`
- Creat `router.ts` amb hash history (compatible Electron + web)
- Rutes: `/` → `HomeView.vue`, `/invite/:code` → `InvitePreview.vue`
- `InvitePreview.vue` usa `router.push('/')` en lloc de `window.location.href`
- `App.vue` usa `<RouterView>` — elimina detecció manual de pathname

### ~~20. Array de missatges sense límit~~ ✅ FET
- `MAX_MESSAGES = 200` a `messageStore.ts`
- `addMessage`: retalla a 200 si s'excedeix
- `loadOlderMessages`: cap combinat a 200 en prepend

### ~~21. Massa `any` als stores~~ ✅ FET
- `serverStore.ts`: `servers: Server[]`, `channels: Channel[]`, `members: ServerMember[]`
- `socketStore.ts`: `FriendRequest` i `FriendResponse` interfaces exportades
- `friendStore.ts`: `friendRequests: FriendRequest[]`, callbacks tipats
- `ServerMember` afegit a `packages/shared/models.ts`

### ~~22. Dependència circular amb import dinàmic~~ ✅ FET
- `serverStore.ts`: import estàtic de `useToastStore` (no existia cicle real)
- Eliminat `await import('../toastStore')` dinàmic

### ~~23. ContentEditable per al chat input~~ ✅ FET
- `ChatInput.vue` reescrit amb `<textarea>` + auto-resize JS (max 128px)
- `addEmoji`: insereix shortcode text al cursor via `setSelectionRange`
- Eliminat `restoreCaret`, `handlePaste`, manipulació innerHTML
- `messageText` ref amb v-model, `charCount` computed

### ~~24. Traducions hardcoded al store~~ ✅ FET
- Extrets a `locales/ca.json`, `locales/es.json`, `locales/en.json`
- `i18nStore.ts` reduït a 15 línies (importa JSONs)

### ~~25. Sense virtualització de la llista de missatges~~ ✅ FET
- Instal·lat `virtua` (1 dep, TypeScript-first, Vue 3 natiu)
- `MessageList.vue` usa `<VList :data="sortedMessages">` — renderitza només items visibles
- `scrollToBottom()` → `vListRef.scrollToIndex(last, { align: 'end' })`
- `handleLoadOlder` → `scrollToIndex(addedCount, { align: 'start' })` per mantenir posició scroll

### ~~26. Emoji picker carrega 400+ emojis a memòria~~ ✅ FET
- `EMOJI_CATEGORIES` extret a `utils/emojiCategories.ts`
- `loading="lazy"` afegit a totes les imatges del picker

### ~~27. Components dupliquen patrons sense abstracció~~ ✅ FET
- Creat `UserAvatar.vue` amb props: `username`, `size` (xs/sm/md/lg), `variant` (accent/surface/base), `online`
- Usat a `MessageList.vue`, `MainLayout.vue`, `Settings.vue`

---

## 🟡 MITJÀ — UX i Accessibilitat

### ~~28. Sense cap test~~ ✅ FET
- Instal·lat `vitest`, `@vitest/coverage-v8`, `supertest` i `vitest-mock-extended`
- Configurat `vitest.config.ts` amb coverage i setup de mocks
- Creat `src/services/__tests__/setup.ts` per a mock de Prisma DeepProxy
- Afegits tests unitaris per a `authService`, `messageService` i `socialService`
- Refactoritzat `index.ts` a `app.ts` per a testejar l'express app sense engegar el port
- Afegit test d'integració `api.test.ts` per a validar endpoints HTTP
- Cobertura inicial de serveis > 50%

### ~~29. Modals sense accessibilitat~~ ✅ FET
- Afegits atributs ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Tancament amb tecla `Escape` (global listener en muntar/mostrar)
- Tancament en fer clic a l'overlay de fons
- Gestió de focus: autofocus automàtic a l'input en obrir el modal
- Relació `label[for]` i `input[id]` amb IDs únics generats dinàmicament

### ~~30. Sense estats de càrrega als botons crítics~~ ✅ FET
- Afegit `isLoading` a `Auth.vue` per a login i registre
- Afegit `loadingRequests` (Set) a `friendStore` per a bloquejar respostes individuals
- Actualitzat `Modal.vue` per a suportar prop `loading` amb feedback visual (spinner)
- Gestionat estats de càrrega a `MainLayout.vue` per a creació/unió de servidors i peticions d'amistat
- Tots els botons crítics ara es desactiven durant l'operació per a prevenir doble submissió

### ~~31. Errors de xarxa desapareixen silenciosament~~ ✅ FET
- Implementat enviament optimista de missatges a `messageStore` (estat `sending`)
- Backend ara retorna ACKs (confirmació o error) per a cada missatge via socket
- `ChatInput.vue` gestiona temp IDs i actualitza estat del missatge segons l'ACK
- `MessageList.vue` mostra indicadors visuals: opacitat per a `sending`, vermell per a `error`
- Afegit botó de reintent (`retry`) per a missatges fallits

### ~~32. Validació de formularis absent~~ ✅ FET
- `Auth.vue`: `validate()` comprova username ≥3 chars (registre), email regex, password ≥8 chars
- Errors mostrats sense cridar l'API — feedback immediat

---

## 🔵 BAIX — Qualitat de codi

### ~~33. URL de l'API hardcoded a l'Electron main~~ ✅ FET
- Creat `apps/desktop/.env` amb `MAIN_VITE_API_URL=https://vertex.sergidalmau.dev/api/v1`
- `main/index.ts` usa `import.meta.env.MAIN_VITE_API_URL ?? fallback`

### ~~34. Sense documentació d'API (OpenAPI/Swagger)~~ ✅ FET
- Instal·lat `swagger-ui-express`
- Creat `src/swagger.ts` amb spec OpenAPI 3.0 (auth, messages, servers, social, admin)
- Muntat a `/api/v1/docs`

### ~~35. bcrypt amb 10 rounds~~ ✅ FET
- Canviat a 12 rounds a `authController.ts`

### ~~36. Refresh token sense rotació~~ ✅ FET
- Backend: genera nou UUID, sobreescriu Redis, retorna `{ accessToken, refreshToken }`
- Frontend: `refreshAccessToken` i `tryBootstrapFromRefresh` guarden el nou refreshToken

### ~~37. Admin únic via env var~~ ✅ FET
- Afegit `isAdmin Boolean @default(false)` a schema Prisma + `prisma generate`
- `requireAdmin`: comprova `user.isAdmin` de BD; `ADMIN_USER_ID` queda com a bootstrap fallback
- `adminService`: `setUserAdmin()` + `isAdmin` a `getAllUsers` select
- Nou endpoint `PUT /admin/users/:id/admin` per promoure/revocar admins

---

## Resum prioritzat

| Prioritat | Nº issues | Acció |
|-----------|-----------|-------|
| 🔴 Crític | 7 | Seguretat i BD — **antes de producció** |
| 🟠 Alt | 10 | Arquitectura i robustesa — Sprint 1 |
| 🟡 Mitjà | 14 | Frontend i UX — Sprint 2 |
| 🔵 Baix | 6 | Qualitat i poliment — Backlog |

## Fitxers principals afectats

- `apps/server/src/index.ts` — CORS, middleware
- `apps/server/src/controllers/authController.ts` — validació, bcrypt, rate limit
- `apps/server/src/services/messageService.ts` — paginació, LIMIT
- `apps/server/src/services/serverService.ts` — N+1 queries
- `apps/server/src/socket/socketHandler.ts` — lògica al handler
- `apps/server/prisma/schema.prisma` — índexos, enums
- `apps/desktop/src/renderer/src/components/Chat.vue` — split, contenteditable
- `apps/desktop/src/renderer/src/components/MainLayout.vue` — split
- `apps/desktop/src/renderer/src/stores/domain/messageStore.ts` — pagination
- `apps/desktop/src/renderer/src/stores/i18nStore.ts` — externalitzar
