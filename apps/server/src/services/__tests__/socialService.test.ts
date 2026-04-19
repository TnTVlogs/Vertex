import { describe, it, expect, vi } from 'vitest'
import { socialService } from '../socialService'
import { prismaMock } from './setup'

describe('socialService', () => {
  it('should check if two users are friends (sorted IDs)', async () => {
    prismaMock.friendship.findUnique.mockResolvedValue({ id: 'f-1' } as any)

    const areFriends = await socialService.areFriends('u-beta', 'u-alpha')

    expect(areFriends).toBe(true)
    // alpha comes before beta
    expect(prismaMock.friendship.findUnique).toHaveBeenCalledWith({
      where: {
        user1Id_user2Id: { user1Id: 'u-alpha', user2Id: 'u-beta' }
      }
    })
  })

  it('should return friends list with other user data', async () => {
    const mockFriendships = [
      {
        user1Id: 'me',
        user2: { id: 'friend-1', username: 'alice' }
      },
      {
        user1Id: 'friend-2',
        user1: { id: 'friend-2', username: 'bob' },
        user2Id: 'me'
      }
    ]

    prismaMock.friendship.findMany.mockResolvedValue(mockFriendships as any)

    const friends = await socialService.getFriends('me')

    expect(friends).toHaveLength(2)
    expect(friends[0].username).toBe('alice')
    expect(friends[1].username).toBe('bob')
  })

  it('should create friend request', async () => {
    prismaMock.friendRequest.create.mockResolvedValue({ id: 'req-1' } as any)

    const id = await socialService.createFriendRequest('u-1', 'u-2')

    expect(id).toBe('req-1')
    expect(prismaMock.friendRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromId: 'u-1',
          toId: 'u-2',
          status: 'pending'
        })
      })
    )
  })
})
