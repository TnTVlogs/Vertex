import { describe, it, expect, vi } from 'vitest'
import { serverService } from '../serverService'
import { prismaMock } from './setup'

// Redis mock — serverService imports redisClient for invite preview cache
vi.mock('../redisService', () => ({
  default: { isOpen: false, get: vi.fn(), setEx: vi.fn() },
  setPresence: vi.fn(),
  refreshPresenceTTL: vi.fn(),
}))

describe('serverService', () => {
  // ── createServer ────────────────────────────────────────────────────────────

  it('creates server with transaction (happy path)', async () => {
    const mockServer = {
      id: 's-1',
      name: 'Test Server',
      channels: [{ id: 'c-1', name: 'general' }],
    }
    prismaMock.user.findUnique.mockResolvedValue({ tier: 'BASIC' } as any)
    prismaMock.server.count.mockResolvedValue(0)
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
    prismaMock.server.create.mockResolvedValue(mockServer as any)

    const result = await serverService.createServer('Test Server', 'u-1')

    expect(result.name).toBe('Test Server')
    expect(result.generalChannelId).toBe('c-1')
  })

  it('throws when BASIC user already has 1 server', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ tier: 'BASIC' } as any)
    prismaMock.server.count.mockResolvedValue(1)

    await expect(serverService.createServer('New Server', 'u-1'))
      .rejects.toThrow('Server limit reached')
  })

  it('allows PRO user to create up to 3 servers', async () => {
    const mockServer = { id: 's-1', name: 'S', channels: [{ id: 'c-1', name: 'general' }] }
    prismaMock.user.findUnique.mockResolvedValue({ tier: 'PRO' } as any)
    prismaMock.server.count.mockResolvedValue(2)
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
    prismaMock.server.create.mockResolvedValue(mockServer as any)

    const result = await serverService.createServer('S', 'u-1')
    expect(result).toBeDefined()
  })

  it('throws when PRO user already has 3 servers', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ tier: 'PRO' } as any)
    prismaMock.server.count.mockResolvedValue(3)

    await expect(serverService.createServer('Extra', 'u-1'))
      .rejects.toThrow('Server limit reached')
  })

  // ── getMembersForServer ──────────────────────────────────────────────────────

  it('returns members for a server', async () => {
    const mockMembers = [
      { id: 'm-1', userId: 'u-1', user: { username: 'alice' } },
      { id: 'm-2', userId: 'u-2', user: { username: 'bob' } },
    ]
    prismaMock.member.findMany.mockResolvedValue(mockMembers as any)

    const members = await serverService.getMembersForServer('s-1')
    expect(members).toHaveLength(2)
    expect(members[0].user.username).toBe('alice')
  })

  it('returns empty array when server has no members', async () => {
    prismaMock.member.findMany.mockResolvedValue([])
    const members = await serverService.getMembersForServer('s-empty')
    expect(members).toHaveLength(0)
  })

  // ── joinServerByCode ─────────────────────────────────────────────────────────

  it('throws on invalid invite code', async () => {
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
    prismaMock.server.findUnique.mockResolvedValue(null)

    await expect(serverService.joinServerByCode('bad-code', 'u-1'))
      .rejects.toThrow('Invalid invite code')
  })

  it('throws on expired invite code', async () => {
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
    prismaMock.server.findUnique.mockResolvedValue({
      id: 's-1',
      inviteCode: 'exp',
      inviteExpiresAt: new Date('2000-01-01'),
    } as any)

    await expect(serverService.joinServerByCode('exp', 'u-1'))
      .rejects.toThrow('expired')
  })

  it('throws when user is already a member', async () => {
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
    prismaMock.server.findUnique.mockResolvedValue({
      id: 's-1',
      inviteCode: 'code-1',
      inviteExpiresAt: null,
    } as any)
    prismaMock.member.findUnique.mockResolvedValue({ id: 'm-1' } as any)

    await expect(serverService.joinServerByCode('code-1', 'u-1'))
      .rejects.toThrow('already a member')
  })

  it('joins server successfully', async () => {
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
    prismaMock.server.findUnique.mockResolvedValue({
      id: 's-1',
      inviteCode: 'code-1',
      inviteExpiresAt: null,
    } as any)
    prismaMock.member.findUnique.mockResolvedValue(null)
    prismaMock.member.create.mockResolvedValue({ id: 'm-new' } as any)

    const result = await serverService.joinServerByCode('code-1', 'u-1')
    expect(result).toBeDefined()
    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { serverId: 's-1', userId: 'u-1', role: 'member' },
      })
    )
  })

  // ── cleanupExpiredInvites ────────────────────────────────────────────────────

  it('cleans up expired invite codes', async () => {
    prismaMock.server.updateMany.mockResolvedValue({ count: 3 })

    const result = await serverService.cleanupExpiredInvites()
    expect(result.count).toBe(3)
    expect(prismaMock.server.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inviteCode: { not: null },
          inviteExpiresAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
        data: { inviteCode: null, inviteExpiresAt: null },
      })
    )
  })

  // ── getPreviewByInviteCode ───────────────────────────────────────────────────

  it('returns preview for valid invite', async () => {
    prismaMock.server.findUnique.mockResolvedValue({
      id: 's-1',
      name: 'Cool Server',
      inviteExpiresAt: null,
      owner: { username: 'owner' },
      _count: { members: 5 },
    } as any)

    const preview = await serverService.getPreviewByInviteCode('valid-code')
    expect(preview.name).toBe('Cool Server')
    expect(preview.memberCount).toBe(5)
  })

  it('throws on expired invite in preview', async () => {
    prismaMock.server.findUnique.mockResolvedValue({
      id: 's-1',
      name: 'Old Server',
      inviteExpiresAt: new Date('2000-01-01'),
      owner: { username: 'owner' },
      _count: { members: 1 },
    } as any)

    await expect(serverService.getPreviewByInviteCode('old-code'))
      .rejects.toThrow('expired')
  })
})
