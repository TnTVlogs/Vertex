# Guia d'Implementació: Vertex Web Client via Apache

Aquesta guia detalla fil per randa tots els canvis a nivell de codi i d'infraestructura necessaris per fer que Vertex es pugui servir independentment en un domini (ex. `https://vertex.sergidalmau.dev`) mitjançant el teu Apache actual, coexistint amb l'App d'Escriptori de forma 100% simètrica i compartint la programació.

## 1. Modificacions al Frontend (Vue / Vite)

L'objectiu principal és fer que la part visual no es trenqui en carregar sense l'API d'Electron. Farem la lògica "Isomòrfica" (detecta on està i s'adapta).

### A. Detecció d'Entorn
Crearem una utilitat que es podrà usar per tot el projecte per saber on estem executant-nos:
```typescript
// src/utils/environment.ts (Nou Fitxer)
export const isElectron = (): boolean => {
    return typeof window !== 'undefined' && typeof window.electron !== 'undefined';
};
```

### B. Gestor Segur de Tokens (Abstracció)
Actualment l'`authStore.ts` demana els tokens o els guarda cridant a `window.electron`. Farem que derivi a `localStorage` de manera nativa on faci falta.

**En el Login/Logout (`authStore.ts`):**
```typescript
// EXEMPLE DE LÒGICA:
import { isElectron } from '../utils/environment';

if (isElectron()) {
   // Fluxe vell Segur d'Escriptori
   await window.electron.ipcRenderer.invoke('save-token', token);
} else {
   // Fluxe nou Natiu Web
   localStorage.setItem('vertex_token', token);
}
```

### C. La Pantalla Splash / Actualitzacions
L'SplahsScreen s'invoca des de l'`App.vue` i bloqueja la pantalla per l'Escriptori per buscar Updates. A la web NO fan falta updates (és automàtic).

**Requisit:** A `App.vue` modificarem el LifeCycle perquè a la web se salti la comprovació per Updates de l'Splash:
```typescript
onMounted(async () => {
  if (!isElectron()) {
     // A la web passem olímpicament de buscar actualitzacions d'escriptori
     ready.value = true;
     return;
  }
  // Codi actual de l'Splash per a Electron...
});
```

---

## 2. Modificacions al Backend (Node.js)

El backend de Node funciona igual de bé amb Webs o App de Windows, *excepte per la seguretat CORS*.

### A. Habilitar la comunicació Creuada (CORS)
Actualment l'Express bloquejarà al Navegador (CORS Error) si la teva pàgina està a `https://vertex.sergidalmau.dev` i el backend a un altre lloc o port intern.
A l'arxiu s'haurà de posar de manera explícita (al `index.ts` o la configuració inicial de Middleware):

```typescript
// server/src/index.ts
import cors from 'cors';

app.use(cors({
    origin: ['https://vertex.sergidalmau.dev', 'http://localhost:5173'], // Permetre web de procudcció i entorn de proves
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Important si pensem usar galetes/headers complexos.
}));
```

---

## 3. Desplegament i Servidor Apache

Utilitzaràs el teu potent ecosistema Apache per hostejar-ho lliure de dependències Node al davant seu.

### A. Constuir el Client (Vite Build)
Cada cop que vulguis publicar una nova versió a la web, exactament igual que fas el paquet instal·lable pel Client de PC, faràs l'empaquetat pel Navegador:
1. Terminal a `/apps/desktop`
2. Correr `npm run build` o equivalent segons els teus scripts definits al `package.json` (El procés base de Vite generarà la carpeta `dist` per la compilació del renderitzador).
*(S'ha de comprovar quina carpeta llença Electron-Vite per a codi de producció web i desplaçar exactament aquesta al servidor).*

### B. Configuració d'Apache (VirtualHost)
Puges els arxius de construcció de Javascript/HTML esmentats daltícia a una carpeta en Linux (ex: `/var/www/vertex/`). Allà s'ha de configurar un nou fitxer d'Apache: `/etc/apache2/sites-available/vertex.conf`

```apache
<VirtualHost *:443>
    # Utilitza la URL Externa per a Vertex Web
    ServerName vertex.sergidalmau.dev
    DocumentRoot /var/www/vertex

    # [PART FRONTEND VUE.JS] - Retorn a Index comú 
    <Directory /var/www/vertex>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        # Si un usuari accedeix directament a /invite/xx retorna 404 a Apache perquè són rutes virtuals.
        # Això redreça l'apache cap al Vue, on funciona correctament de manera nativa.
        FallbackResource /index.html 
    </Directory>

    # [PART BACKEND NODE API] Proxy Pass de l'Apache de Fora -> a l'API de Dins per peticions estàndards
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api

    # [PART BACKEND WEBSOCKETS] Proxy Pass Vital pel xat actiu.
    # Dirigeix les conexions ws:// sota seguretat Apache SSL WSTunnel al port 3000 on Socket.IO escolta
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/socket.io/(.*) ws://localhost:3000/socket.io/$1 [P,L]
    
    ProxyPass /socket.io/ http://localhost:3000/socket.io/
    ProxyPassReverse /socket.io/ http://localhost:3000/socket.io/
    

    # Configuració de Certificat SS (Let'sEncrypt)
    SSLEngine on
    SSLCertificateFile /path/a/teu/cert.pem
    SSLCertificateKeyFile /path/a/teu/privkey.pem
</VirtualHost>
```

---

## Comentari d'Implementació Ràpida
Implementar el punt número 1 (Abstracció Isomòrfica) ens podria portar entre **30 i 60 minuts** de picar codi en conjunt actualitzant els `Stores`. Posteriorment de la part de l'Apache de producció només és copiar l'estructura documentada a dalt que te portarà 5 minuts un cop la configuris per primer cop al vps.

> [!WARNING]
> Estem segurs d'avançar la viabilitat isomòrfica ara mateix o tenies intenció de polir parts d'àudio o del back-end primer abans de preparar compatibilitats estructurals? L'aplicació Web obre moltes possibilitats d'escala.
