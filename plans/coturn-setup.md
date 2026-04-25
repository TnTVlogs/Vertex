# coturn — Instal·lació i configuració a Oracle Cloud (Ubuntu ARM)

## Requisits previs

- Ubuntu 22.04+ en Oracle Cloud (ARM / Ampere)
- Domini: `vertex.sergidalmau.dev` ja apuntant al servidor
- Certificats SSL existents a `/etc/ssl/cloudflare/cert.pem` i `privkey.pem`
- Accés `sudo`

---

## 1. Instal·lar coturn

```bash
sudo apt update && sudo apt install coturn -y
```

Habilitar el servei (per defecte ve desactivat):

```bash
sudo nano /etc/default/coturn
```

Descomenta o afegeix:
```
TURNSERVER_ENABLED=1
```

---

## 2. Configurar coturn

```bash
sudo nano /etc/turnserver.conf
```

Substitueix el contingut sencer per:

```conf
# ── Xarxa ─────────────────────────────────────────────────────────────────────
listening-port=3478
tls-listening-port=5349

# IP pública del servidor (comprova amb: curl ifconfig.me)
external-ip=LA_TEVA_IP_PUBLICA

# ── TLS ────────────────────────────────────────────────────────────────────────
cert=/etc/ssl/cloudflare/cert.pem
pkey=/etc/ssl/cloudflare/privkey.pem
cipher-list="ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512"

# ── Autenticació ───────────────────────────────────────────────────────────────
fingerprint
lt-cred-mech
realm=vertex.sergidalmau.dev

# Usuari TURN (pots canviar la contrasenya)
user=vertex:CANVIA_AQUESTA_CONTRASENYA

# ── Ports de relay ─────────────────────────────────────────────────────────────
min-port=49152
max-port=65535

# ── Seguretat ──────────────────────────────────────────────────────────────────
no-multicast-peers
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255

# ── Logs ───────────────────────────────────────────────────────────────────────
log-file=/var/log/turnserver.log
no-stdout-log
verbose
```

---

## 3. Obrir ports al firewall del sistema (iptables/ufw)

### Si uses `ufw`:
```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp
sudo ufw reload
```

### Si uses `iptables` directament (Ubuntu ARM Oracle):
```bash
sudo iptables -I INPUT -p tcp --dport 3478 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 3478 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 5349 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 5349 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 49152:65535 -j ACCEPT

# Guardar regles per a reinicis
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

---

## 4. Obrir ports a Oracle Cloud Console (Security List)

A la consola OCI:

1. **Networking → Virtual Cloud Networks → La teva VCN → Security Lists → Default Security List**
2. Afegir regles **Ingress** (entrada):

| Protocol | Port | Descripció |
|----------|------|------------|
| TCP | 3478 | TURN plain |
| UDP | 3478 | TURN plain |
| TCP | 5349 | TURN TLS |
| UDP | 5349 | TURN TLS |
| UDP | 49152-65535 | TURN relay ports |

---

## 5. Iniciar i habilitar coturn

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
sudo systemctl status coturn
```

Ha de mostrar `active (running)`.

---

## 6. Verificar que funciona

Test ràpid:
```bash
# Des de qualsevol màquina amb turnutils instal·lat:
sudo apt install coturn -y
turnutils_uclient -t -u vertex -w CANVIA_AQUESTA_CONTRASENYA vertex.sergidalmau.dev
```

O des del navegador: [https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)
- TURN URI: `turn:vertex.sergidalmau.dev:3478`
- Username: `vertex`
- Password: la que has posat
- Fes clic "Gather candidates" — ha d'apareixer un candidat tipus `relay`

---

## 7. Configurar `.env` del servidor Vertex

```env
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=turn:vertex.sergidalmau.dev:3478
TURN_USER=vertex
TURN_PASS=CANVIA_AQUESTA_CONTRASENYA
```

Reinicia el servidor Vertex:
```bash
cd /home/tntvlogs/Vertex/apps/server
pm2 restart vertex-server   # o com el tinguis arrancat
```

---

## 8. Renovació de certificats (si uses Cloudflare certs)

Els certificats de Cloudflare no expiren (Origin certs 15 anys). Si en algun moment canvies a Let's Encrypt:

```bash
# Reiniciar coturn després de renovar:
sudo systemctl reload coturn
```

---

## Resum de ports necessaris

| Port | Protocol | Servei |
|------|----------|--------|
| 3478 | TCP+UDP | TURN (no xifrat) |
| 5349 | TCP+UDP | TURNS (TLS) |
| 49152-65535 | UDP | Relay de media WebRTC |

---

## Consum de recursos estimat

Per a una trucada amb screen share 1080p60 entre 2 usuaris via TURN:
- **RAM**: ~30 MB addicionals
- **CPU**: ~5% d'1 core (reenvía paquets, no encoda)
- **Ample de banda**: ~15 Mbps sostingut (~5 GB/hora)
- Oracle Cloud dóna 10 TB/mes gratuïts → còmode per a ús normal

---

## Solució de problemes habituals

**coturn no arrenca:**
```bash
sudo journalctl -u coturn -n 50
```
Comprova que els certificats existeixen i coturn els pot llegir:
```bash
sudo -u turnserver cat /etc/ssl/cloudflare/cert.pem
# Si dona error de permisos:
sudo chmod 640 /etc/ssl/cloudflare/*.pem
sudo chown root:turnserver /etc/ssl/cloudflare/*.pem
```

**Candidats relay no apareixen:**
- Comprova que els ports 49152-65535 UDP estan oberts a la Security List d'Oracle
- Comprova `external-ip` al config — ha de ser la IP pública real del servidor

**Logs en temps real:**
```bash
sudo tail -f /var/log/turnserver.log
```
