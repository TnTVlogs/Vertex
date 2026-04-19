import { describe, it, expect } from 'vitest'
import { socialService } from '../socialService'
import { prismaMock } from './setup'

describe('socialService', () => {
  // ── areFriends ───────────────────────────────────────────────────────────────

  it('returns true when friendship exists (sorts IDs)', async () => {
    prismaMock.friendship.findUnique.mockResolvedValue({ id: 'f-1' } as any)

    const result = await socialService.areFriends('u-beta', 'u-alpha')

    expect(result).toBe(true)
    expect(prismaMock.friendship.findUnique).toHaveBeenCalledWith({
      where: { user1Id_user2Id: { user1Id: 'u-alpha', user2Id: 'u-beta' } },
    })
  })

  it('returns false when no friendship exists', async () => {
    prismaMock.friendship.findUnique.mockResolvedValue(null)
    const result = await socialService.areFriends('u-1', 'u-2')
    expect(result).toBe(false)
  })

  // ── requestExists ────────────────────────────────────────────────────────────

  it('returns true when pending request exists', async () => {
    prismaMock.friendRequest.findFirst.mockResolvedValue({ id: 'req-1' } as any)
    const result = await socialService.requestExists('u-1', 'u-2')
    expect(result).toBe(true)
  })

  it('returns false when no pending request', async () => {
    prismaMock.friendRequest.findFirst.mockResolvedValue(null)
    const result = await socialService.requestExists('u-1', 'u-2')
    expect(result).toBe(false)
  })

  it('checks both directions for existing request', async () => {
    prismaMock.friendRequest.findFirst.mockResolvedValue({ id: 'req-1' } as any)
    await socialService.requestExists('u-1', 'u-2')
    expect(prismaMock.friendRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { fromId: 'u-1', toId: 'u-2' },
            { fromId: 'u-2', toId: 'u-1' },
          ],
        },
      })
    )
  })

  // ── createFriendRequest ──────────────────────────────────────────────────────

  it('creates friend request and returns id', async () => {
    prismaMock.friendRequest.create.mockResolvedValue({ id: 'req-new' } as any)

    const id = await socialService.createFriendRequest('u-1', 'u-2')

    expect(id).toBe('req-new')
    expect(prismaMock.friendRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromId: 'u-1', toId: 'u-2', status: 'pending' }),
      })
    )
  })

  // ── getFriends ───────────────────────────────────────────────────────────────

  it('returns friends list with correct other-user resolution', async () => {
    const mockFriendships = [
      { id: 'f-1', user1Id: 'me', user2Id: 'friend-1', user2: { id: 'friend-1', username: 'alice', status: 'ACTIVE', avatarUrl: null } },
      { id: 'f-2', user1Id: 'friend-2', user2Id: 'me', user1: { id: 'friend-2', username: 'bob', status: 'ACTIVE', avatarUrl: null } },
    ]
    prismaMock.friendship.findMany.mockResolvedValue(mockFriendships as any)

    const { friends, nextCursor } = await socialService.getFriends('me')

    expect(friends).toHaveLength(2)
    expect(friends[0].username).toBe('alice')
    expect(friends[1].username).toBe('bob')
    expect(nextCursor).toBeNull()
  })

  it('returns empty friends list', async () => {
    prismaMock.friendship.findMany.mockResolvedValue([])
    const { friends, nextCursor } = await socialService.getFriends('lonely')
    expect(friends).toHaveLength(0)
    expect(nextCursor).toBeNull()
  })

  it('paginates correctly with cursor (hasMore=true)', async () => {
    const limit = 2
    // Return limit+1 items to signal hasMore
    const mockFriendships = [
      { id: 'f-1', user1Id: 'me', user2Id: 'a', user2: { id: 'a', username: 'alice', status: 'ACTIVE', avatarUrl: null } },
      { id: 'f-2', user1Id: 'me', user2Id: 'b', user2: { id: 'b', username: 'bob', status: 'ACTIVE', avatarUrl: null } },
      { id: 'f-3', user1Id: 'me', user2Id: 'c', user2: { id: 'c', username: 'carol', status: 'ACTIVE', avatarUrl: null } },
    ]
    prismaMock.friendship.findMany.mockResolvedValue(mockFriendships as any)

    const { friends, nextCursor } = await socialService.getFriends('me', limit)

    expect(friends).toHaveLength(2)
    expect(nextCursor).toBe('f-2')
  })

  it('passes cursor to prisma query', async () => {
    prismaMock.friendship.findMany.mockResolvedValue([])
    await socialService.getFriends('me', 50, 'cursor-id')
    expect(prismaMock.friendship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'cursor-id' },
        skip: 1,
      })
    )
  })

  // ── getUsernameById ──────────────────────────────────────────────────────────

  it('returns username when user exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ username: 'alice' } as any)
    const name = await socialService.getUsernameById('u-1')
    expect(name).toBe('alice')
  })

  it('returns null when user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const name = await socialService.getUsernameById('missing')
    expect(name).toBeNull()
  })
})
