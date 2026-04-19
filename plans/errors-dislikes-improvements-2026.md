# Auditoria d'Errors, Desaprovacions i Millores — Abril 2026

## Context

Anàlisi crítica del projecte Vertex per identificar errors actius, pràctiques que no s'ajusten a estàndards moderns, i oportunitats de millora. Basat en revisió de codi, anàlisi estàtica i bones pràctiques de desenvolupament. El projecte està en bon estat general, però hi ha àrees per polir.

---

## 🔴 CRÍTIC — Errors i Problemes Actius

### 1. Console.log en serveis de producció
**Problema**: Diversos serveis usen `console.log` en lloc de `logger` estructurat, exposant logs interns en stdout/stderr.
```ts
// redisService.ts
console.log('Redis Client Error (Suppressing further logs):', err.message);
console.log('Connected to Redis');
```
**Risc**: Logs inconsistents, difícil debugging en prod, informació sensible en logs.
**Solució**: Reemplaçar tots `console.log` amb `logger.info/error/warn`.
**Esforç**: 1 hora
**Prioritat**: Alta

### 2. Scripts de debug al directori src
**Problema**: Fitxers `check_db.js` i `check_db_v2.js` al `src/` amb `console.log` i queries directes.
**Risc**: Codi mort, confusió, possible execució accidental en prod.
**Solució**: Moure a `scripts/debug/` o eliminar si no s'usen.
**Esforç**: 30 minuts
**Prioritat**: Mitjana

### 3. Falta de validació de dependències en CI/CD
**Problema**: No hi ha comprovacions d'auditoria de dependències (npm audit, Snyk) en el pipeline.
**Risc**: Vulnerabilitats en paquets de tercers no detectades.
**Solució**: Afegir `npm audit --audit-level=moderate` i escaneig de vulnerabilitats al CI.
**Esforç**: 2 hores
**Prioritat**: Alta

---

## 🟠 ALT — Pràctiques que No M'agraden

### 4. Ús inconsistent de async/await vs Promises
**Problema**: Alguns llocs usen `.then().catch()` en lloc d'async/await per consistència.
```ts
// Exemple hipotètic
somePromise.then(result => {
  // ...
}).catch(err => logger.error(err));
```
**Desaprovació**: Inconsistència estilística, difícil llegibilitat.
**Solució**: Estandarditzar a async/await a tot el codebase.
**Esforç**: 3 hores
**Prioritat**: Baixa

### 5. Noms de variables massa genèrics
**Problema**: Variables com `data`, `result`, `error` sense context específic.
```ts
const data = await fetchFriends();
const result = processData(data);
```
**Desaprovació**: Difícil manteniment, debugging confús.
**Solució**: Usar noms descriptius com `friendsData`, `processedFriends`.
**Esforç**: 4 hores (revisió completa)
**Prioritat**: Mitjana

### 6. Falta de constants per valors màgics
**Problema**: Nombres i strings hardcoded sense constants.
```ts
if (count >= 20) // Rate limit
await redisClient.expire(key, 60); // TTL
```
**Desaprovació**: Difícil canvi, errors de manteniment.
**Solució**: Definir constants com `RATE_LIMIT_MAX = 20`, `RATE_LIMIT_WINDOW = 60`.
**Esforç**: 2 hores
**Prioritat**: Mitjana

---

## 🟡 MITJÀ — Millores Recomanades

### 7. Afegir monitoring i observabilitat
**Problema**: Sense mètriques de rendiment, errors o ús (APM, metrics).
**Millora**: Integrar Prometheus + Grafana per mètriques, o similar.
**Esforç**: 8 hores
**Prioritat**: Alta

### 8. Millorar cobertura de tests
**Problema**: Cobertura ~10%, falta tests per controladors i middleware.
**Millora**: Afegir tests unitaris per totes les rutes i serveis crítics.
**Esforç**: 12 hores
**Prioritat**: Crítica

### 9. Implementar caching avançat
**Problema**: Consultes repetitives sense cache (ex: llistes d'amics, membres de servidor).
**Millora**: Cache amb Redis per dades estàtiques/freqüents.
**Esforç**: 6 hores
**Prioritat**: Mitjana

### 10. Afegir rate limiting global
**Problema**: Rate limiting només a login/registre i sockets, no a totes les rutes.
**Millora**: Middleware global de rate limiting per IP/usuari.
**Esforç**: 3 hores
**Prioritat**: Alta

### 11. Optimitzar queries N+1
**Problema**: Possible N+1 en algunes consultes complexes (ex: missatges amb autors).
**Millora**: Usar `include` de Prisma per carregar relacions en una query.
**Esforç**: 4 hores
**Prioritat**: Mitjana

### 12. Afegir sanitització d'input més estricta
**Problema**: Validació amb Zod però sense sanitització de XSS en inputs de text.
**Millora**: Integrar DOMPurify per camps de text lliure.
**Esforç**: 2 hores
**Prioritat**: Alta

---

## 📊 MÈTRIQUES DE MILLORA

- **Errors crítics**: 3 (baix)
- **Desaprovacions**: 3 (estil)
- **Millores**: 6 (funcionals)
- **Esforç total estimat**: ~45 hores
- **Prioritat global**: Mitjana-Alta

Aquest pla se centra en polir un projecte ja sòlid, passant de "funcional" a "production-ready" amb millors pràctiques.