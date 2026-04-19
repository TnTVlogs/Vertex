# Vertex Deployment Guide

## 1. Desktop Application (Windows, Mac, Linux)

```bash
cd apps/desktop
npm install
```

| Platform | Command | Output |
|---|---|---|
| Windows | `npm run build:win` | `dist/*.exe` |
| Linux | `npm run build:linux` | `dist/*.AppImage` |
| macOS | `npm run build:mac` | `dist/*.dmg` |

> **Note:** macOS builds require a macOS machine. Cross-compilation not supported.

---

## 2. Server Deployment (Ubuntu 22.04 / 24.04)

### Prerequisites

```bash
sudo apt update
sudo apt install -y mariadb-server redis-server nodejs npm nginx certbot python3-certbot-nginx git
sudo npm install -g pm2
```

Node.js 20+ required. Install via NodeSource if `apt` version is old:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

### Step 1: Database Setup

```bash
sudo mysql_secure_installation
```

```sql
CREATE DATABASE vertex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vertex_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON vertex.* TO 'vertex_user'@'localhost';
FLUSH PRIVILEGES;
```

---

### Step 2: Redis Configuration

Edit `/etc/redis/redis.conf`:
```
bind 127.0.0.1
requirepass your_redis_password
maxmemory 256mb
maxmemory-policy allkeys-lru
```

```bash
sudo systemctl enable redis-server
sudo systemctl restart redis-server
```

---

### Step 3: Clone Repository

```bash
git clone https://github.com/TnTVlogs/Vertex.git /home/$USER/vertex
cd /home/$USER/vertex/apps/server
```

---

### Step 4: Environment Variables

Create `/home/$USER/vertex/apps/server/.env`:

```env
DATABASE_URL=mysql://vertex_user:your_strong_password@localhost:3306/vertex
REDIS_URL=redis://:your_redis_password@localhost:6379
JWT_SECRET=generate_with_openssl_rand_base64_48
PORT=3000
NODE_ENV=production
SERVER_BASE_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,app://vertex
ALLOWED_ATTACHMENT_HOSTS=
```

Generate JWT_SECRET:
```bash
openssl rand -base64 48
```

---

### Step 5: Install Dependencies

```bash
cd /home/$USER/vertex/apps/server
npm install
```

> **Important:** Use `npm install` (not `npm install --omit=dev`). `prisma` is a devDependency needed to generate the client.

---

### Step 6: Generate Prisma Client + Run Migrations

```bash
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma migrate deploy
```

> **Always use the local Prisma binary** (`./node_modules/.bin/prisma`), not `npx prisma` or `sudo npx prisma` — those may pick up a globally installed version.

---

### Step 7: Build

```bash
npm run build
```

Compiles TypeScript → `dist/`. Verify `dist/index.js` exists before continuing.

---

### Step 8: Start with PM2

```bash
pm2 start dist/index.js --name vertex-server
pm2 save
pm2 startup
```

Run the `pm2 startup` output command to enable auto-start on reboot.

---

### Step 9: HTTPS with Nginx

Create `/etc/nginx/sites-available/vertex`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # File uploads (avatars, attachments)
    client_max_body_size 12M;

    location /uploads/ {
        alias /home/$USER/vertex/apps/server/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

> Replace `$USER` with your actual username (e.g. `ubuntu`, `tntvlogs`).

```bash
sudo ln -s /etc/nginx/sites-available/vertex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 3. Desktop Configuration

Set env vars before building the desktop app:

```env
VITE_API_URL=https://yourdomain.com/api/v1
VITE_SOCKET_URL=https://yourdomain.com
```

---

## 4. Updating (after `git pull`)

```bash
cd /home/$USER/vertex/apps/server
git pull
npm install
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma migrate deploy   # only if schema changed
npm run build
pm2 restart vertex-server
```

---

## 5. Operations

| Task | Command |
|---|---|
| View logs | `pm2 logs vertex-server` |
| Monitor | `pm2 monit` |
| Restart | `pm2 restart vertex-server` |
| Stop | `pm2 stop vertex-server` |
| Redis CLI | `redis-cli -a your_redis_password` |
| DB console | `mysql -u vertex_user -p vertex` |
| Prisma Studio | `./node_modules/.bin/prisma studio` |
