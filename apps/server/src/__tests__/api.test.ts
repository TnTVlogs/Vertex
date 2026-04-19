import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'

describe('API Integration', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/non-existent')
    expect(res.status).toBe(404)
  })
})
