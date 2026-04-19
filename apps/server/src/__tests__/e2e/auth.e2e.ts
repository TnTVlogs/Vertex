/**
 * E2E tests for auth endpoints.
 * Requires: real DB + running server env vars (DATABASE_URL, JWT_SECRET, REDIS_URL).
 * Run: npx vitest --config vitest.e2e.config.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app'

const uniqueSuffix = () => Date.now().toString(36)

describe('Auth E2E', () => {
  let accessToken: string
  let userId: string
  const email = `e2e-${uniqueSuffix()}@test.vertex`
  const password = 'E2EPassword1!'
  const username = `e2e_${uniqueSuffix()}`

  it('POST /api/v1/auth/register — creates user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password, username })

    expect(res.status).toBe(201)
    expect(res.body.user).toBeDefined()
    userId = res.body.user.id
  })

  it('POST /api/v1/auth/login — rejects PENDING account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password })

    // Account is PENDING until admin approves
    expect([401, 403]).toContain(res.status)
  })

  it('GET /api/v1/health — returns ok', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('GET /api/v1/auth/me — returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/auth/me — returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.here')
    expect(res.status).toBe(401)
  })
})
