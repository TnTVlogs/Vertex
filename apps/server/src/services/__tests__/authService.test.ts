import { describe, it, expect, vi } from 'vitest'
import { authService } from '../authService'
import { prismaMock } from './setup'

describe('authService', () => {
  it('should create a new user', async () => {
    const mockUser = {
      id: '1234',
      username: 'testuser',
      email: 'test@example.com',
    }

    prismaMock.user.create.mockResolvedValue(mockUser as any)

    const user = await authService.createUser(
      'testuser',
      'test@example.com',
      'hashed_password',
      '127.0.0.1'
    )

    expect(user).toEqual(mockUser)
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
          registrationIp: '127.0.0.1',
        }),
      })
    )
  })

  it('should get user by email', async () => {
    const mockUser = {
      id: '1234',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      status: 'ACTIVE',
      tier: 'BASIC',
      avatarUrl: null,
    }

    prismaMock.user.findUnique.mockResolvedValue(mockUser as any)

    const user = await authService.getUserByEmail('test@example.com')

    expect(user).toEqual(mockUser)
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'test@example.com' },
      })
    )
  })

  it('should count users by IP', async () => {
    prismaMock.user.count.mockResolvedValue(5)

    const count = await authService.countUsersByIp('127.0.0.1')

    expect(count).toBe(5)
    expect(prismaMock.user.count).toHaveBeenCalledWith({
      where: { registrationIp: '127.0.0.1' },
    })
  })
})
