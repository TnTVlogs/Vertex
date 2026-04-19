import { describe, it, expect, vi } from 'vitest'
import { messageService } from '../messageService'
import { prismaMock } from './setup'

describe('messageService', () => {
  it('should create a message in a channel', async () => {
    const mockMsg = {
      id: 'msg-1',
      content: 'hello',
      authorId: 'u-1',
      channelId: 'c-1',
      recipientId: null,
      attachmentUrl: null,
      author: { id: 'u-1', username: 'alice', avatarUrl: null }
    }

    prismaMock.message.create.mockResolvedValue(mockMsg as any)

    const msg = await messageService.createMessage({
      authorId: 'u-1',
      content: 'hello',
      channelId: 'c-1'
    })

    expect(msg).toEqual(mockMsg)
    expect(prismaMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'hello',
          channelId: 'c-1'
        })
      })
    )
  })

  it('should throw if no channel or recipient', async () => {
    await expect(messageService.createMessage({
      authorId: 'u-1',
      content: 'hello'
    })).rejects.toThrow('Message must have either a channel or a recipient')
  })

  it('should fetch channel messages and reverse them', async () => {
    const mockMsgs = [
      { id: '2', content: 'newest', createdAt: new Date('2024-01-01T12:00:00Z') },
      { id: '1', content: 'oldest', createdAt: new Date('2024-01-01T11:00:00Z') },
    ]

    prismaMock.message.findMany.mockResolvedValue(mockMsgs as any)

    const msgs = await messageService.getChannelMessages('c-1')

    // Expect reversed: oldest first
    expect(msgs[0].id).toBe('1')
    expect(msgs[1].id).toBe('2')
    expect(prismaMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { channelId: 'c-1' },
        orderBy: { createdAt: 'desc' }
      })
    )
  })

  it('should count today messages', async () => {
    prismaMock.message.count.mockResolvedValue(10)

    const count = await messageService.countTodayMessages('u-1')

    expect(count).toBe(10)
    expect(prismaMock.message.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authorId: 'u-1',
          createdAt: expect.objectContaining({
            gte: expect.any(Date)
          })
        })
      })
    )
  })
})
