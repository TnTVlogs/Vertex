# Documentació del Servidor (Vertex Server)

Aquest document detalla l'arquitectura, el funcionament intern i la infraestructura del servidor de **Vertex**, construït amb **Node.js**, **Express**, **Socket.IO**, **Prisma**, **MariaDB** i **Redis**.

---

## 1. Arquitectura del Sistema

El servidor de Vertex és una aplicació monolítica estructurada per ser escalable i reactiva. Utilitza un model de comunicació híbrida:
- **REST API (Express):** Per a operacions "pesades" o de gestió única (Login, Registre, Creació de Servidors).
- **WebSockets (Socket.IO):** Per a la comunicació en temps real (Xat, Notificacions, Presència).
- **Redis:** Actua com a capa d'estat ràpid per a la presència d'usuaris i com a bus de missatgeria (Pub/Sub).

---

## 2. Capa de Dades (MariaDB + Prisma 7)

Vertex utilitza **MariaDB** com a motor de base de dades relacional. La interacció es fa mitjançant **Prisma 7**, però amb una particularitat tècnica: l'ús d'adaptadors.

### 2.1 El Driver Adapter (`src/services/prisma.ts`)
Prisma 7 ha canviat la forma en què es connecta a les bases de dades per permetre entorns "Edge" i "Serverless". 
- **Adaptador:** Utilitzem `@prisma/adapter-mariadb` combinat amb el driver d'alt rendiment `mariadb` (el driver oficial de Node.js).
- **Pool de connexions:** Es gestiona manualment mitjançant un "Pool" per optimitzar les connexions simultànies.

### 2.2 El Repositori de Dades Directe (`src/services/db.ts`)
Encara que s'usa Prisma per a algunes consultes, moltes rutes encara utilitzen consultes SQL directes via el pool de `mysql2`. Això proporciona un control total sobre el rendiment en operacions crítiques com l'inici del servidor.

---

## 3. Comunicació en Temps Real (Socket.IO)

El motor de temps real es troba a `src/socket/socketHandler.ts`. 

### 3.1 Flux de Connexió
1. **`join-user`**: Quan el client es connecta, s'uneix a una "sala" (room) única `user:${userId}`. Això permet enviar-li missatges privats o notificacions personalitzades des de qualsevol part del servidor.
2. **`join-channel`**: El client s'uneix a sales de canals `channel:${channelId}` per rebre missatges de grups o servidors.

### 3.2 Lògica de Xat (`send-message`)
Quan algú envia un missatge:
1. Es persisteix a MariaDB (MySQL).
2. S'emet via Socket.IO a la sala corresponent (canal o usuari receptor).
3. Es publica a Redis (Pub/Sub) per a futures expansions (clusterització).

---

## 4. Capa de Presència (Redis)

Redis és fonamental per gestionar qui està "en línia".
- **Estat de Presència:** Es guarda una clau `presence:${userId}` amb valor `online`/`offline`.
- **Rapidesa:** En lloc de consultar la base de dades MariaDB constantment per saber l'estat d'un amic, es consulta Redis, que és molt més ràpid (memòria RAM).
- **Sincronització:** Quan un usuari es connecta (`join-user`), el servidor publica un esdeveniment `presence-update` a tots els altres clients connectats per actualitzar la interfície visual de l'App Desktop.

---

## 5. Estructura de Directoris i Fitxers

### `/src/routes/`
Defineixen els punts d'entrada de l'API REST:
- **`auth.ts`**: Login, registre i verificació de token (/api/v1/auth).
- **`social.ts`**: Gestió d'amics i peticions pendents.
- **`servers.ts`**: Creació i llistat de servidors i canals.
- **`messages.ts`**: Històric de missatges.

### `/src/services/`
Aquí resideix la lògica de negoci real, desacoblada de les rutes:
- **`authService.ts`**: Lògica de xifrat de contrasenyes i generació de JWT.
- **`prisma.ts`**: Configuració del client de Prisma amb l'adaptador MariaDB.
- **`redisService.ts`**: Interfície simplificada per interactuar amb Redis.
- **`socialService.ts`**: Gestió de les relacions d'amics a nivell de dades.

---

## 6. Seguretat

- **JWT (JSON Web Token):** S'utilitza per autenticar cada petició a l'API. El secret es guarda a la variable d'entorn `JWT_SECRET`.
- **Bcrypt:** Les contrasenyes mai es guarden en text clar; s'aplica un "hashing" robust abans de guardar-les a la base de dades.
- **CORS:** Configurat per permetre connexions exclusivament des de l'entorn de l'aplicació d'escriptori.

---

## 7. Desplegament i Infraestructura (Ubuntu)

El servidor funciona sota **PM2** (Process Manager 2) en un entorn Ubuntu. 
- **PM2** garanteix que si el servidor falla, s'auto-reinicia immediatament.
- També permet veure logs en temps real amb `pm2 logs vertex-server`.
- **Prisma 7 CLI:** S'utilitza `prisma.config.ts` per gestionar l'especificitat de la versió 7 a Fedora/Ubuntu, permetent connectar la CLI directament a la base de dades del servidor.
