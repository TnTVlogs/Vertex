/**
 * E2E tests for messaging endpoints.
 * Requires: real DB + running server env vars.
 * Run: npx vitest --config vitest.e2e.config.ts
 */
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../../app'

describe('Messaging E2E', () => {
  it('GET /api/v1/messages/:targetId — 401 without auth', async () => {
    const res = await request(app)
      .get('/api/v1/messages/some-channel-id?type=channel')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/messages/:targetId — 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/messages/some-channel-id?type=channel')
      .set('Authorization', 'Bearer bad.token')
    expect(res.status).toBe(401)
  })

  it('DELETE /api/v1/messages/:messageId — 401 without auth', async () => {
    const res = await request(app)
      .delete('/api/v1/messages/some-msg-id')
    expect(res.status).toBe(401)
  })
})
