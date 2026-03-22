# Vertex Deployment Guide

This guide provides instructions for building the desktop application and deploying the server on an Ubuntu environment.

## 1. Desktop Application (Windows, Mac, Linux)

To generate executables and installers, follow these steps on your development machine:

1.  **Install Dependencies**:
    ```bash
    cd apps/desktop
    npm install
    ```
2.  **Build and Package**:
    - **Windows**: `npm run build:win` (Generates `.exe` in `dist/`)
    - **Linux**: `npm run build:linux` (Generates `.AppImage` in `dist/`)
    - **Mac**: `npm run build:mac` (Generates `.dmg` in `dist/`)

> [!NOTE]
> Building for Mac requires a macOS machine. Building for Windows/Linux can generally be done on their respective platforms or via cross-compilation tools (though native is recommended).

---

## 2. Server Deployment (Ubuntu)

### Prerequisites
- Ubuntu 22.04 or 24.04
- Node.js v20+
- MariaDB (or MySQL)
- Redis
- PM2 (`npm install -g pm2`)

### Step 1: Install System Dependencies
```bash
sudo apt update
sudo apt install -y mariadb-server redis-server nodejs npm
```

### Step 2: Database Setup
1.  **Secure MariaDB**: `sudo mysql_secure_installation`
2.  **Create Database**:
    ```sql
    CREATE DATABASE vertex;
    CREATE USER 'vertex_user'@'localhost' IDENTIFIED BY 'your_password';
    GRANT ALL PRIVILEGES ON vertex.* TO 'vertex_user'@'localhost';
    FLUSH PRIVILEGES;
    ```
3.  **Initialize Schema**:
    After setting up the `.env` file (see Step 3), run the following command to create tables:
    ```bash
    npx ts-node src/scripts/setup-db.ts
    ```

### Step 3: Server Preparation
1.  **Clone/Copy Code**: Transfer the `apps/server` directory to your Ubuntu server.
2.  **Install Dependencies**:
    ```bash
    cd apps/server
    npm install --omit=dev
    ```
3.  **Configure Environment**:
    Create a `.env` file in `apps/server/`:
    ```env
    PORT=3000
    DB_HOST=127.0.0.1
    DB_USER=vertex_user
    DB_PASSWORD=your_password
    DB_NAME=vertex
    REDIS_URL=redis://localhost:6379
    JWT_SECRET=your_super_secret_key
    ```
4.  **Build the Server**:
    ```bash
    npm run build
    ```

### Step 4: Run with PM2
To ensure the server stays online and restarts automatically:
```bash
pm2 start dist/index.js --name "vertex-server"
pm2 save
pm2 startup
```

---

## 3. Post-Deployment
- Ensure the desktop app is configured to point to your Ubuntu server's IP/domain.
- Check logs using `pm2 logs vertex-server`.
