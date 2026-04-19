# Vertex Server

Express + Prisma + MariaDB + Redis backend for Vertex chat application.

## Requirements

- Node.js v20+
- MariaDB 10.6+
- Redis 7+

## Setup

```bash
cp .env.example .env
# Edit .env with your values
npm install
npx prisma migrate deploy
npm run dev
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | MariaDB connection string | `mysql://user:pass@localhost:3306/vertex` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-secret-here` |
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | Environment | `development` / `production` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173,app://vertex` |
| `ALLOWED_ATTACHMENT_HOSTS` | Comma-separated attachment hostnames | `cdn.yourdomain.com` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:coverage` | Run tests with coverage report |

## Database Migrations

```bash
# Apply pending migrations
npx prisma migrate deploy

# Create new migration (development only)
npx prisma migrate dev --name your_migration_name

# Open Prisma Studio (DB GUI)
npx prisma studio
```

## Architecture

```
src/
├── config/       # env, redis, prisma clients
├── controllers/  # HTTP request handlers
├── middleware/   # auth, error handler, rate limiting
├── routes/       # Express route definitions
├── services/     # Business logic
└── socket/       # Socket.IO handlers
```
