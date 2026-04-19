/**
 * E2E tests for server endpoints.
 * Requires: real DB + running server env vars.
 * Run: npx vitest --config vitest.e2e.config.ts
 */
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../../app'

describe('Servers E2E', () => {
  it('POST /api/v1/servers/create — 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/servers/create')
      .send({ name: 'Test' })
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/servers/create — 401 with invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/servers/create')
      .set('Authorization', 'Bearer bad.token')
      .send({ name: 'Test' })
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/servers/invite/:code — 404 for unknown code', async () => {
    const res = await request(app)
      .get('/api/v1/servers/invite/nonexistent-code-xyz')
    expect([404, 400]).toContain(res.status)
  })

  it('POST /api/v1/servers/join — 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/servers/join')
      .send({ inviteCode: 'abc123' })
    expect(res.status).toBe(401)
  })
})
