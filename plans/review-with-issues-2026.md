# Revisió crítica del projecte Vertex — Abril 2026

## Context

Revisió ràpida basada en estructura i problemes típics dels docs de `plans`. Centrat en backend, frontend i infra. És una anàlisi de punts febles, errors visibles i coses que no m'agraden.

---

## 🔴 Errors que detecto

### 1. `console.log` a codi de servidor
**Problema**: `server/src/services` i `server/src/scripts` usen `console.log` en lloc de logger central.
**Risc**: logs desordenats, impossible agrupar per correlació, pot filtrar dades internes.
**Fix**: usar `logger.info/error/warn` a `src/utils/logger.ts` i eliminar `console.log` de producció.

### 2. Falta de middleware global d'errors
**Problema**: `server/src/app.ts` no mostra middleware final `errorHandler` per capturar exceptions no gestionades.
**Risc**: crash del servidor, respostes 500 inconsistents, leak d'errors interns.
**Fix**: basta `app.use(errorHandler)` després de les rutes.

### 3. `tsconfig` i `baseUrl` deprecated
**Problema**: `apps/desktop/tsconfig.json` usa `baseUrl`, i `server/tsconfig.json` pot dependre de configuració antiga.
**Risc**: trencament amb TypeScript 7+, warnings constants.
**Fix**: migrar a imports relatius o set camp `ignoreDeprecations` segons necessiti.

### 4. Dependència beta a Electron
**Problema**: `apps/desktop/package.json` usa `electron-vite 6.0.0-beta.1`.
**Risc**: build inestable, regressions de packaging.
**Fix**: baixar a versió estable 5.x o equivalent provat.

### 5. Rate limiting en memòria per sockets
**Problema**: ratelimit de socket probablement usa `Map` local i s'esborra al restart.
**Risc**: bypass en reiniciar, no funciona en cluster.
**Fix**: portar-lo a Redis amb TTL i comptadors per usuari.

### 6. Env vars sense `.env.example`
**Problema**: no hi ha template clar per variables de configuració tant a `server/` com a `apps/desktop/`.
**Risc**: onboarding lent, deploys mal configurats.
**Fix**: crear `.env.example` per server i desktop amb variables obligatòries.

---

## 🟠 Coses a millorar

### 7. Documentació dèbil de deployment
**Problema**: `deployment_guide.md` existeix però sembla incomplet respecte a migrations, Redis, HTTPS i secrets.
**Millora**: afegir passos clars per `prisma migrate deploy`, SSL, env secure, Redis i backup.

### 8. Cobertura de tests baixa
**Problema**: dins `server/src/__tests__` hi ha tests, però no hi ha proves E2E ni cobertura global alta.
**Millora**: afegir tests d'integració per auth, missatges, invitations i middleware. E2E amb Playwright/Cypress per flux de xat.

### 9. Estil inconsistent d'async
**Problema**: pot haver mescla de `async/await` i `.then()` en serveis i scripts.
**Millora**: estandarditzar a `async/await` i evitar promeses mixtes.

### 10. Noms de variables massa genèrics
**Problema**: exemples típics `data`, `result`, `error` a middleware i serveis.
**Millora**: usar noms específics com `messagePayload`, `userFriends`, `validationError`.

### 11. Masses `any` o tipus parcials en stores
**Problema**: `packages/shared/models.ts` pot estar bé, però stores de Vue sovint acaben amb `any` per facilitar integració.
**Millora**: tipar `serverStore`, `socketStore`, `friendStore` amb models clars, evitar `any` a components.

---

## 🟡 No m'agrada

### 12. Scripts de debug a `src`
**Problema**: fitxers de debug en `src/` fan soroll i poden confondre.
**No m'agrada**: codi mort o temporal a llocs de producció.
**Fix**: moure a `scripts/` o eliminar.

### 13. Falta de constants per valors màgics
**Problema**: TTL, límits, strings literals amagats en codi.
**No m'agrada**: canviar valor global es torna difícil.
**Fix**: extreure constants a fitxers de config o `constants.ts`.

### 14. Frontend massa pesat per a components grans
**Problema**: `apps/desktop/src/renderer/src` probable inclou components voluminosos sense separar.
**No m'agrada**: difícil testear i refactoritzar.
**Fix**: dividir components grans (`Chat.vue`, `Settings.vue`, `ServerModal.vue`) en subcomponents petits.

### 15. Puja d'assets en frontend sense cache control
**Problema**: si el client serveix imatges o fitxers, no queda clar si hi ha headers de cache.
**No m'agrada**: UX lenta en load repetit.
**Fix**: afegir estrategia de caching per recursos estàtics quan sigui possible.

---

## Recomanació general

- Prioritzar `errors crítics`: seguridad, logging, error handler, env validation.
- Next, ordenar `millores` per impacte: tests + docs + rate limiting durable.
- Final: estil i refactor: variables, components, constants.

Aquest fitxer és revisió ràpida. Aplica abans de desplegar a producció.
