# Anàlisi i Full de Ruta: Funcions de Veu/Vídeo & Compatibilitat Web

Aquest document avalua la viabilitat tècnica i la complexitat d'implementar xats de veu, vídeo i compartició de pantalla a Vertex, així com la relació i l'estratègia pel que fa a la compatibilitat amb navegadors web.

---

## 1. Com de complicat és fer Xats de Veu i Vídeo?

**Nivell de Complexitat: Mitjà-Alt**

La tecnologia que ho permet s'anomena **WebRTC** (Web Real-Time Communication). Hi ha dos elements principals que haurem de construir:

### A. El Servidor de Senyalització (Signaling Server)
Abans que dues (o més) persones es passin l'àudio s'han de localitzar per internet. 
- **La bona notícia:** El teu `server` actual ja funciona amb `Socket.io`, que és el motor *perfecte* ideal per fer aquesta senyalització inicial (Parlar-se per dir "hola, estic a l'IP tal, el meu vídeo està codificat així, connectem").

### B. El Mètode de Nexió (Mesh vs SFU)
Com que Vertex vol assemblar-se a Discord, s'ha de pensar en gran:
- **Mesh (P2P pur):** Tots envien i reben d'absolutament tothom. Fàcil de programar, consum de servidor = 0, però **impossible si hi ha més de 4 persones** (el teu PC petarà havent d'enviar 5 senyals alhora empetitint l'ample de banda a l'infern).
- **SFU (Selective Forwarding Unit):** Tal com funciona Discord. Cada persona envia l'àudio/vídeo al servidor (només pujen 1 cop), i el servidor ho reparteix a la resta. Requereix usar eines externes o llibreries de node com `mediasoup` o `livekit` i suposa més consum pel servidor, però escala per tenir milers de persones en el canal.

---

## 2. Complicació d'afegir Càmera i Compartir Pantalla
Un cop estigui construïda l'estructura d'Àudio amb WebRTC exposada adalt, **passar a Càmera i Compartir pantalla és pràcticament l'equivalent a canviar la variable "AUDIO_NOMES" per "AUDIO_I_VIDEO_SI-US_PLAU".**

WebRTC s'encarrega sol de mantenir l'àudio i el vídeo sincronitzat (són el mateix "Stream" o canal multimèdia empaquetat als navegadors).

---

## 3. Implementació per Web vs App (És diferent?)

Hi ha el mite que fer vídeo en una app és molt diferent de la web, però en aquest cas **NO HO ÉS**.

Com que Vertex funciona basat en JS al davant i l'App és nativa en Chromium gràcies a l'Electron, **el 95% del codi i sintaxis a escriure serà EXACTAMENT idèntic** per les dues variables.

L'únic on difereix dràsticament (un 5% de complicació pel que t'ho faig saber en transparència) és l'àmbit restrictiu i de permissibilitat:

1.  **Compartir pantalla (Screen Share):** A un navegador de Chrome si cliques a 'compartir', et surt la finestreta nativa del navegador que et prega triar quina app/pestanya. Electron no ho té, de fet, haurem de construir nosaltres explícitament al Vue un petit menú recollint via el motor IPC les fonts d'origen o `DesktopCapturer` i que l'usuari triï clicant.
2.  **Permisos Micro/Cam**: A Electron l'usuari ja té permisos totals quan engega. A la Web farà falta la típica alerta de seguretat nativa "Aquesta pàgina prega l'accés al micròfon".

---

## 4. Quins passos faria jo? (L'Estratègia Òptima)

Si ens posem a programar a cegues el WebRTC de Veu (molt complex) sota Electron, perdrem molt temps en debugar si no va al cent per cent un audio que es creua. Depurar connexions WebRTC directament al Chrome (el navegador real) té unes eines infinites dissenyades exactament justament per analitzar això que a l'Escriptori es ocult.

### El Cicle que et recomano:

**FASE 1: Acabar la Adaptació Web isomorfa (Primer)**
- Aplicar la detecció per a la gestió de KeyTar (Storage d'Electron) i la passació per als usuaris no residents d'app web.
- Afavoriràs tenir 2 branques (App PC, Enllaç a Navegador) per desenvolupar abans d'involucrar tecnologies massivament demandants. (Et portarà màxim dues tardes depenent de l'apache).

**FASE 2: Nucli de Veu via WebRTC al DOM**
- Implementar Livekit o senyalització crua per Mesh.
- Fer-ho arrencar correctament.

**FASE 3: Polir Escriptori i Captures Locals (Screen Share Electron)**
- Adaptarem de prop com l'Electron mostra el dialet especial indicat pel `DesktopCapturer` que requereixen els compartiments de monitor de PCs Windows i Mac.

---

### Verificació Lògica
La millor idea ara és arrencar amb el FrontEnd i preparar `environment.ts` per fer que no peti si cliques vertex des d'un Edge/Chrome lliure. Aprovi la proposta i ataquem.
