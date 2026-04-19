# Vertex Deployment Guide

Build the desktop app and deploy the server on Ubuntu.

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

> **Note:** macOS builds require a macOS machine. Cross-compilation is not supported.

---

## 2. Server Deployment (Ubuntu 22.04 / 24.04)

### Prerequisites

```bash
sudo apt update
sudo apt install -y mariadb-server redis-server nodejs npm nginx certbot python3-certbot-nginx
npm install -g pm2
```

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

### Step 3: Server Setup

```bash
git clone https://github.com/your-org/vertex.git /opt/vertex
cd /opt/vertex/apps/server
npm install --omit=dev
```

Create `/opt/vertex/apps/server/.env`:

```env
DATABASE_URL=mysql://vertex_user:your_strong_password@localhost:3306/vertex
REDIS_URL=redis://:your_redis_password@localhost:6379
JWT_SECRET=generate_with_openssl_rand_base64_48
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,app://vertex
ALLOWED_ATTACHMENT_HOSTS=cdn.yourdomain.com
```

> **Generate JWT_SECRET:** `openssl rand -base64 48`

### Step 4: Database Migrations

```bash
cd /opt/vertex/apps/server
npx prisma migrate deploy
```

Run this command on every deployment that includes schema changes.

### Step 5: Build and Start

```bash
npm run build
pm2 start dist/index.js --name vertex-server
pm2 save
pm2 startup
```

### Step 6: HTTPS with Nginx

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

```bash
sudo ln -s /etc/nginx/sites-available/vertex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com
```

---

## 3. Desktop Configuration

Point the desktop app at your server by setting env vars before building:

```env
VITE_API_URL=https://yourdomain.com/api/v1
VITE_SOCKET_URL=https://yourdomain.com
```

---

## 4. Updating

```bash
cd /opt/vertex
git pull
cd apps/server
npm install --omit=dev
npx prisma migrate deploy
npm run build
pm2 restart vertex-server
```

---

## 5. Operations

| Task | Command |
|---|---|
| View logs | `pm2 logs vertex-server` |
| Monitor processes | `pm2 monit` |
| Restart server | `pm2 restart vertex-server` |
| Redis CLI | `redis-cli -a your_redis_password` |
| DB console | `mysql -u vertex_user -p vertex` |
| Prisma Studio | `npx prisma studio` |
