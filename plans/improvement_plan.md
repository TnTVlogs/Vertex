# Pla de Millora del Projecte Vertex

## Context

Anàlisi exhaustiva del projecte Vertex (aplicació de xat tipus Discord) per identificar problemes, vulnerabilitats i àrees de millora. Cobreix backend (Express + Prisma + MariaDB), frontend (Vue 3 + Electron + Pinia) i infraestructura. Projecte funcional però necessita correccions per producció. Risc mitjà → alt després de les correccions de Fase 1.

---

## 🔴 CRÍTIC — Seguretat i Configuració

### 1. TypeScript baseUrl deprecated
- **Context**: Els fitxers tsconfig.json usen `baseUrl` que està deprecated a TypeScript 7.0
- **Problema**: Compilacions fallaran quan s'actualitzi TS. Warnings actuals indiquen risc imminent
- **Impacte**: Errors de compilació, builds trencats en futures versions
- **Solució**: Afegir `"ignoreDeprecations": "6.0"` als dos tsconfig.json o migrar a resolució sense baseUrl
- **Esforç**: 30 minuts
- **Prioritat**: Alta (bomba de rellotge)

### 2. Electron vite plugin beta
- **Context**: desktop/package.json usa electron-vite 6.0.0-beta.1
- **Problema**: Versió beta en configuració de producció, canvis trencadors possibles
- **Impacte**: Builds inestables, regressions inesperades
- **Solució**: Downgrade a versió estable 5.x
- **Esforç**: 1 hora (testejar després)
- **Prioritat**: Crítica (no beta en prod)

### 3. Sense global error handler
- **Context**: Express app no té middleware centralitzat per errors no manejats
- **Problema**: Errors no capturats causen crashes del servidor, respostes inconsistents
- **Impacte**: Servidor cau amb errors no previstos, clients reben errors interns
- **Solució**: Afegir middleware errorHandler després de totes les rutes
- **Esforç**: 2 hores
- **Prioritat**: Crítica

### 4. Helmet configuració dèbil
- **Context**: app.ts té `helmet()` però amb defaults, sense CSP/HSTS personalitzats
- **Problema**: Falta X-Frame-Options, Content-Security-Policy, HSTS, etc.
- **Impacte**: Vulnerabilitats de seguretat (clickjacking, XSS, etc.)
- **Solució**: Configurar helmet amb directives personalitzades
- **Esforç**: 1.5 hores
- **Prioritat**: Crítica

### 5. Validació d'entorn de producció absent
- **Context**: env.ts valida variables però no comprova requeriments de producció
- **Problema**: Desplegaments prod amb settings insegurs (JWT curt, localhost DB)
- **Impacte**: Exposició de dades, fallades de seguretat en prod
- **Solució**: Afegir validacions refinades per NODE_ENV=production
- **Esforç**: 1.5 hores
- **Prioritat**: Alta

---

## 🔴 CRÍTIC — Testing i Qualitat

### 6. Cobertura de tests <10%
- **Context**: Només 2 tests bàsics existeixen, cap test per serveis principals
- **Problema**: Bugs en codi no testejat, regressions, fallades de desplegament
- **Impacte**: Errors en prod, confiança baixa en canvis
- **Solució**: Afegir unit tests per auth, messages, servers, social + middleware
- **Esforç**: 8 hores (camí crític)
- **Prioritat**: Crítica

### 7. Sense tests E2E
- **Context**: Cap test end-to-end per workflows complets d'usuari
- **Problema**: Fluxos integrals no validats (registre→missatge, crear server→unir)
- **Impacte**: Bugs en integracions, UX trencada
- **Solució**: Cypress/Playwright per escenaris clau
- **Esforç**: 6 hores
- **Prioritat**: Crítica

---

## 🟠 ALT — Type Safety i Validació

### 8. Non-null assertions sense verificació
- **Context**: Codigo usa `userId!.add(socketId)` sense comprovar si userId existeix
- **Problema**: Errors runtime si Map.get() retorna null
- **Impacte**: Crashes inesperats, comportament inconsistent
- **Solució**: Afegir checks null o usar Map.get() amb defaults
- **Esforç**: 2 hores
- **Prioritat**: Alta

### 9. Type casting sense validació
- **Context**: socketHandler.ts fa `as string | undefined` i `as Tier` sense runtime checks
- **Problema**: Mismatch de tipus causa errors silenciosos
- **Impacte**: Dades corruptes, seguretat compromesa
- **Solució**: Validar després de JWT decode, usar zod per dades socket
- **Esforç**: 3 hores
- **Prioritat**: Alta

### 10. Middleware inconsistent
- **Context**: Algunes rutes usen requireActive, altres no
- **Problema**: Usuaris PENDING/BANNED accedeixen a operacions restringides
- **Impacte**: Bypass de controls d'accés
- **Solució**: Afegir guards consistents a totes les rutes de membre
- **Esforç**: 2 hores
- **Prioritat**: Alta

---

## 🟠 ALT — Seguretat Addicional

### 11. Query injection risk
- **Context**: messageController.ts cerca sense límit de longitud
- **Problema**: DoS potencial amb queries molt llargues
- **Impacte**: Rendiment degradat, possible DoS
- **Solució**: Afegir max length (256 chars) amb zod
- **Esforç**: 1 hora
- **Prioritat**: Mitjana

### 12. Refresh token validació dèbil
- **Context**: Endpoint accepta userId del body sense validar ownership
- **Problema**: Possibles bypass si request interceptada
- **Impacte**: Rotació de token compromesa
- **Solució**: No confiar en userId del body, validar amb JWT
- **Esforç**: 2 hores
- **Prioritat**: Mitjana

---

## 🟡 MITJÀ — Rendiment i Escalabilitat

### 13. Sense gestió de transaccions
- **Context**: Operacions multi-step (check+create) sense Prisma transactions
- **Problema**: Condicions de carrera en requests concurrents
- **Impacte**: Inconsistències de dades
- **Solució**: Wrap en `prisma.$transaction()`
- **Esforç**: 3 hores
- **Prioritat**: Mitjana

### 14. Rate limiting in-memory només
- **Context**: socketRateLimits Map només existeix en memòria
- **Problema**: Rate limiting es perd amb restart o failover
- **Impacte**: Bypass possible reconnectant
- **Solució**: Moure a Redis amb TTL
- **Esforç**: 2 hores
- **Prioritat**: Mitjana

### 15. Sense optimització de queries
- **Context**: getDirectMessages retorna TOTS missatges sense filtre temporal
- **Problema**: Queries lentes amb volum alt, sense paginació
- **Impacte**: Rendiment pobre, timeouts
- **Solució**: Afegir indexes DB, paginació cursor-based
- **Esforç**: 4 hores
- **Prioritat**: Mitjana

---

## 🟡 MITJÀ — Documentació i Config

### 16. Falta .env.example
- **Context**: Cap template per variables d'entorn
- **Problema**: Desenvolupadors nous/desplegaments confosos
- **Impacte**: Errors de config, temps perdut
- **Solució**: Crear .env.example per server i desktop
- **Esforç**: 1 hora
- **Prioritat**: Mitjana

### 17. Documentació de deployment incompleta
- **Context**: deployment_guide.md falta passos (migrations, HTTPS, Redis)
- **Problema**: Desplegaments manuals propensos a errors
- **Impacte**: Fallades en prod, inconsistències
- **Solució**: Expandir guia amb passos complets
- **Esforç**: 2 hores
- **Prioritat**: Mitjana

### 18. READMEs absents
- **Context**: Desktop i server sense docs de setup
- **Problema**: Configuració desconeguda (VITE_API_URL, etc.)
- **Impacte**: Errors d'integració, delays
- **Solució**: Afegir README.md per cada mòdul
- **Esforç**: 2 hores
- **Prioritat**: Mitjana

---

## Testing Requirements

### Unit Tests
- Auth service: register, login, refresh, logout
- Message service: create, search, delete, tier limits
- Server service: create, join, members, invites
- Social service: friend requests, friendships
- Middleware: auth, admin, active, rate limiting
- Utilities: logger, validators
- Error scenarios: input invalid, DB errors, auth failures

### Integration Tests
- Flux complet auth (register → login → refresh → logout)
- Cicle missatges (create → read → delete)
- Operacions server (create → invite → join → manage)
- Rate limiting (verificar triggers als llindars correctes)
- Restriccions tier (verificar límits per tier)
- Events Socket.IO i ACKs
- Validació CORS

### E2E Tests
- Nou usuari registre fins primer missatge
- Crear i gestionar server
- Missatgeria directa entre usuaris
- Presència i status online
- Operacions admin (ban/kick usuari)
- Gestió errors i recovery

---

## Production Readiness Criteria

- Cobertura tests >80%
- Tots bugs crítics corregits
- Tests E2E passant
- Documentació completa
- Auditoria seguretat passada
- Cap dependència beta

---

## Next Steps

1. Començar correccions crítiques immediatament
2. Executar tests després de cada fix
3. Actualitzar docs quan implementat
4. Re-auditoria després de completar crítiques