# Estudi de Viabilitat: Vertex Web Client i Migració a Nginx

Aquest document detalla l'estudi complet sobre la viabilitat d'extreure el client actual de Vertex i portar-ho al navegador web, així com una anàlisi profunda sobre la convivència o migració del servidor web actual (Apache) cap a Nginx.

---

## Part 1: El Client Web de Vertex

### 1. És possible?
**Sí, totalment possible i altament recomanable.**
L'arquitectura base actual del frontend està feta amb Vue 3 + Vite, que són tecnologies web 100% natives. L'únic motiu pel qual ara mateix et falla al navegador és per **dependències específiques d'Electron** (Gestió de Tokens Segurs i Pantalla de Càrrega).

### 2. Què es va trencar i com s'arregla?
El client depèn de l'objecte `window.electron` per a l'emmagatzematge segur (Keytar) i les actualitzacions.
**Solució**: Crear un codi "Isomòrfic" (Adaptador). Això farà que l'aplicació detecti on s'està executant: si està a l'aplicació de Windows usarà el sistema segur (Electron), si està al navegador web usarà el `localStorage` del navegador. Un sol codi per a totes les plataformes.

### 3. Pros i Contres (Web vs Desktop)
- **Fricció Zero (Pro)**: Els usuaris s'uneixen fent clic a un link (`invite/y30p5`) sense descarregar res. Perfecte per fer créixer la comunicació.
- **Multiplataforma (Pro)**: Funcionarà a iOS, Android, Linux, Xbox o qualsevol cosa amb un navegador.
- **Seguretat del Token (Contra)**: A la web s'ha de guardar al `localStorage`, que és menys segur que l'emmagatzematge xifrat del Windows, però és l'estàndard web (Discord ho fa així).
- **CORS (Contra)**: Caldrà configurar el Backend Node perquè permeti peticions des de la web.

---

## Part 2: Infraestructura (Apache vs Nginx)

Com que ja tens experiència amb **Apache** i tens serveis complexos com **Nextcloud** funcionant allà, plantejar-se un canvi a Nginx és una decisió important d'arquitectura.

### 1. Què necessita Vertex?
Vertex necessita allotjar 5-6 fitxers estàtics (HTML, CSS, JS) generats pel Vue.
**Realisme**: Tant Apache com Nginx poden servir fitxers estàtics de manera fulminant, no demanen recursos. L'única diferència és si ho trobes més assequible un que l'altre. Vertex **NO t'obliga** a usar Nginx. Ho pots fer directament amb Apache. A continuació com es faria:

```apache
# Exemple de configuració per a Vertex Client Web en Apache (en general)
<VirtualHost *:443>
    ServerName vertex.sergidalmau.dev
    DocumentRoot /var/www/vertex-frontend/dist

    # Aquest bloc permet que l'enrutament intern del Vue (Vue Router) funcioni
    <Directory /var/www/vertex-frontend/dist>
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>
</VirtualHost>

# Proxies d'APIS al teu backend NODEJS via el mateix fitxer
# (ProxyPass /api http://localhost:3000/api...)
```

### 2. "Haig de canviar Nextcloud i tot de Apache cap a Nginx?"

> [!WARNING]
> Migrar un **Nextcloud** d'Apache a Nginx és una tasca famosa per ser un maldecap bastant important (és "A pain in the ass" monumental per administració local). Nextcloud està nativament dissenyat per executar-se idealment sobre estructures PHP-FPM associades amb Apache. Nginx no utilitza `.htaccess` per sobre-escriure rutes (ho usa Nextcloud intensament) llavors ho has de posar TOT manual a l'arxiu de Nginx per funcionar correctament.

### 3. La Viabilitat de la Migració (Pros i Contres)

#### Per què Nginx? (Els Pros)
- Nginx és brutalment ràpid i consumeix pocs recursos actuant com a **Proxy Invers**. (A l'hora de derivar peticions lliurades de Vertex al Node backend l'Nginx rendimenta millor).
- Millor gestió de milers de Websockets alhora.

#### Per què QUEDAR-TE amb Apache? (Els Contres Nginx pel teu ecosistema)
- La rampa d'aprenentatge és alta si ets asidu a Apache (la configuració funciona totalment diferent a nivell condicional if/location).
- **Risc de trencar Nextcloud:** Canviar les regles requeriria hores investigant la seva equivalència si no saps Nginx (Cal traduir els `RewriteRules` .htaccess de nextcloud a blocs `location {}`).
- NextCloud funciona moltíssim i molt bé integrat directament amb el mod de php natiu o proxied en Apache, Nginx demana més intermedis per això.

---

## 3. Conclusió i Recomanació Estratègica

No hi ha una raó obligatòria per canviar el teu servidor de referència. **L'estratègia amb menys maldecaps és no desestabilitzar la teva plataforma i mantenir-te a Apache.**

**La Ruta més assenyada:**
1. Mantingues **Apache** com a Servidor Web principal.
2. Allotja els fitxers FrontEnd compilats del Vertex Client com una carpeta (`/var/www/vertex/dist`).
3. Utilitza la configuració d'Apache `mod_proxy_wstunnel` (ja deus saber l'ús suposo) per enllaçar el web Socket que fa anar tot el nodeJS per als que et consultin desde fora.
4. **Vertex funcionarà perfectament sota Apache i no posaràs en risc Nextcloud.**

Així podràs donar el salt d'accedibilitat fent "Vertex Accessible" mantenint el fortí controlable per tu mateix on ja et sents còmode.
