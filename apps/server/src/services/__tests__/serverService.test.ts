import { describe, it, expect, vi } from 'vitest'
import { serverService } from '../serverService'
import { prismaMock } from './setup'

describe('serverService', () => {
  it('should create a server with transaction', async () => {
    const mockServer = {
      id: 's-1',
      name: 'Test Server',
      channels: [{ id: 'c-1', name: 'general' }]
    }

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return callback(prismaMock)
    })

    prismaMock.server.create.mockResolvedValue(mockServer as any)

    const result = await serverService.createServer('Test Server', 'u-1')

    expect(result.name).toBe('Test Server')
    expect(result.generalChannelId).toBe('c-1')
    expect(prismaMock.server.create).toHaveBeenCalled()
  })

  it('should fetch members for a server', async () => {
    const mockMembers = [
      { id: 'm-1', userId: 'u-1', user: { username: 'alice' } },
      { id: 'm-2', userId: 'u-2', user: { username: 'bob' } }
    ]

    prismaMock.member.findMany.mockResolvedValue(mockMembers as any)

    const members = await serverService.getMembersForServer('s-1')

    expect(members).toHaveLength(2)
    expect(members[0].user.username).toBe('alice')
  })

  it('should fail joining server with invalid invite code', async () => {
    prismaMock.server.findUnique.mockResolvedValue(null)

    await expect(serverService.joinServerByCode('invalid', 'u-1'))
      .rejects.toThrow('Invalid invite code')
  })

  it('should join server successfully', async () => {
    const mockServer = { id: 's-1', inviteCode: 'code-1', inviteExpiresAt: null }
    prismaMock.server.findUnique.mockResolvedValue(mockServer as any)
    prismaMock.member.findUnique.mockResolvedValue(null)
    prismaMock.member.create.mockResolvedValue({ id: 'm-1' } as any)

    const result = await serverService.joinServerByCode('code-1', 'u-1')

    expect(result).toBeDefined()
    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { serverId: 's-1', userId: 'u-1', role: 'member' }
      })
    )
  })
})
