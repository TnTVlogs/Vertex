# Vertex Desktop

Electron + Vue 3 + Pinia desktop client for Vertex chat application.

## Requirements

- Node.js v20+
- A running Vertex server instance

## Setup

```bash
cp .env.example .env
# Edit .env to point to your server
npm install
npm run dev
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Server REST API base URL | `http://localhost:3000/api/v1` |
| `VITE_SOCKET_URL` | Server Socket.IO URL | `http://localhost:3000` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development mode with hot reload |
| `npm run build` | Build for current platform |
| `npm run build:win` | Build Windows installer (`.exe`) |
| `npm run build:linux` | Build Linux AppImage |
| `npm run build:mac` | Build macOS DMG (requires macOS) |
| `npm run build:web` | Build as web app |
| `npm test` | Run unit tests |

## Architecture

```
src/
├── main/         # Electron main process
├── preload/      # Electron preload scripts
└── renderer/     # Vue 3 frontend
    ├── components/
    ├── pages/
    ├── stores/   # Pinia stores
    └── router/
```

## Building Distributables

Build artifacts are output to `dist/`. Each platform requires its own build:

- **Windows**: Run `npm run build:win` on Windows
- **Linux**: Run `npm run build:linux` on Linux
- **macOS**: Run `npm run build:mac` on macOS (cross-compilation not supported)
