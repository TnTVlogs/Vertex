export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Vertex API',
    version: '1.0.0',
    description: 'REST API for the Vertex chat platform',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          avatarUrl: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'BANNED'] },
          tier: { type: 'string', enum: ['BASIC', 'PRO', 'VIP'] },
          isAdmin: { type: 'boolean' },
        },
      },
      Server: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          iconUrl: { type: 'string', nullable: true },
          ownerId: { type: 'string', format: 'uuid' },
          inviteCode: { type: 'string', nullable: true },
          inviteExpiresAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Channel: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          serverId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['text', 'voice'] },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          attachmentUrl: { type: 'string', nullable: true },
          authorId: { type: 'string', format: 'uuid' },
          channelId: { type: 'string', format: 'uuid', nullable: true },
          recipientId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'Server is healthy' } },
      },
    },

    // ─── Auth ─────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', minLength: 3 },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User created, pending admin approval' },
          '400': { description: 'Duplicate email/username or validation error' },
          '429': { description: 'Rate limit exceeded (3 registrations/hour per IP)' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
          '403': { description: 'Account pending or banned' },
          '429': { description: 'Rate limit exceeded (5 attempts/15 min per IP)' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate refresh token and get new access token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken', 'userId'],
                properties: {
                  refreshToken: { type: 'string' },
                  userId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'New tokens',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout (invalidates refresh token)',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Logged out' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user object',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },

    // ─── Messages ─────────────────────────────────────────────────────────────
    '/messages/search': {
      get: {
        summary: 'Full-text search messages in a channel',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'channelId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'q', in: 'query', required: true, description: 'Full-text search query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Matching messages ordered by recency',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
                  },
                },
              },
            },
          },
          '400': { description: 'Missing channelId or q' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/messages/{targetId}': {
      get: {
        summary: 'Get paginated messages for a channel or DM',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'targetId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'type', in: 'query', required: true, schema: { type: 'string', enum: ['channel', 'dm'] } },
          { name: 'userId', in: 'query', description: 'Required when type=dm — the other participant', schema: { type: 'string', format: 'uuid' } },
          { name: 'before', in: 'query', description: 'Cursor: only return messages before this timestamp', schema: { type: 'string', format: 'date-time' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Messages list with cursor-based pagination',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
                    hasMore: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid type or missing userId for DM' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Account suspended' },
        },
      },
    },
    '/messages/{messageId}': {
      delete: {
        summary: 'Soft-delete a message (author or admin)',
        tags: ['Messages'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'messageId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Message deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — not the author' },
          '404': { description: 'Message not found' },
        },
      },
    },

    // ─── Servers ──────────────────────────────────────────────────────────────
    '/servers/create': {
      post: {
        summary: 'Create a new server',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', minLength: 1, maxLength: 100 } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Server created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Server' } },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Server limit reached for this tier' },
        },
      },
    },
    '/servers/user/{userId}': {
      get: {
        summary: 'Get servers a user is a member of',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'List of servers',
            content: {
              'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Server' } } },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/servers/invite/{code}': {
      get: {
        summary: 'Get server preview by invite code (public)',
        tags: ['Servers'],
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Server preview (name, member count). Cached 5 min in Redis.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    memberCount: { type: 'integer' },
                  },
                },
              },
            },
          },
          '404': { description: 'Invalid or expired invite code' },
        },
      },
    },
    '/servers/join': {
      post: {
        summary: 'Join a server via invite code',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['inviteCode', 'userId'],
                properties: {
                  inviteCode: { type: 'string' },
                  userId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Joined successfully' },
          '400': { description: 'Invalid/expired invite code or already a member' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/servers/{serverId}/channels': {
      get: {
        summary: 'Get channels for a server',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'serverId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'List of channels',
            content: {
              'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Channel' } } },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create a channel in a server (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'serverId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 100 },
                  type: { type: 'string', enum: ['text', 'voice'], default: 'text' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Channel created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Channel' } },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
    },
    '/servers/{serverId}/members': {
      get: {
        summary: 'Get members of a server',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'serverId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'List of members with user details' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/servers/{id}/channels/{channelId}': {
      put: {
        summary: 'Update a channel (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'channelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Channel updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
      delete: {
        summary: 'Delete a channel (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'channelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Channel deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
    },
    '/servers/{id}/invite': {
      post: {
        summary: 'Generate invite link (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Invite code and expiry',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    inviteCode: { type: 'string' },
                    inviteExpiresAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
      delete: {
        summary: 'Revoke invite link (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Invite revoked' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
    },
    '/servers/{id}/members/{userId}/mute': {
      put: {
        summary: 'Mute a member in a server (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { mutedUntil: { type: 'string', format: 'date-time', nullable: true, description: 'null = permanent mute' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Member muted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
      delete: {
        summary: 'Unmute a member (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Member unmuted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
    },
    '/servers/{id}/members/{userId}/ban': {
      put: {
        summary: 'Ban a member from a server (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Member banned — cannot rejoin via invite' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
      delete: {
        summary: 'Unban a member (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Member unbanned' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
    },
    '/servers/{id}/members/{userId}': {
      delete: {
        summary: 'Kick a member from a server (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Member kicked' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner or cannot kick owner' },
        },
      },
    },
    '/servers/{id}/transfer': {
      put: {
        summary: 'Transfer server ownership (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newOwnerId'],
                properties: { newOwnerId: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Ownership transferred' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
    },
    '/servers/{id}': {
      delete: {
        summary: 'Delete a server and all its channels/members (owner only)',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Server deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not server owner' },
        },
      },
    },

    // ─── Social ───────────────────────────────────────────────────────────────
    '/social/request': {
      post: {
        summary: 'Send a friend request',
        tags: ['Social'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fromId', 'toId'],
                properties: {
                  fromId: { type: 'string', format: 'uuid' },
                  toId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Friend request sent' },
          '400': { description: 'Already friends or request already exists' },
        },
      },
    },
    '/social/requests/{userId}': {
      get: {
        summary: 'Get pending friend requests for a user',
        tags: ['Social'],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Array of pending friend requests' },
        },
      },
    },
    '/social/request/respond': {
      post: {
        summary: 'Accept or reject a friend request',
        tags: ['Social'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['requestId', 'action'],
                properties: {
                  requestId: { type: 'string', format: 'uuid' },
                  action: { type: 'string', enum: ['accept', 'reject'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Request processed' },
          '404': { description: 'Request not found' },
        },
      },
    },
    '/social/friends/{userId}': {
      get: {
        summary: 'Get friends list with cursor-based pagination',
        tags: ['Social'],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'cursor', in: 'query', description: 'Friendship ID to paginate from', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Friends with nextCursor for pagination',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    friends: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                    nextCursor: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ─── Admin ────────────────────────────────────────────────────────────────
    '/admin/users': {
      get: {
        summary: 'List all users',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Users array',
            content: {
              'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/admin/users/{id}/status': {
      put: {
        summary: 'Set user status (PENDING / ACTIVE / BANNED)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'BANNED'] } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/admin/users/{id}/tier': {
      put: {
        summary: 'Set user tier (BASIC / PRO / VIP)',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tier'],
                properties: { tier: { type: 'string', enum: ['BASIC', 'PRO', 'VIP'] } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Tier updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/admin/users/{id}/admin': {
      put: {
        summary: 'Grant or revoke admin privileges',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isAdmin'],
                properties: { isAdmin: { type: 'boolean' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Admin status updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
    '/admin/users/{id}': {
      delete: {
        summary: 'Hard-delete a user account',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'User deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Admin only' },
        },
      },
    },
  },
};
