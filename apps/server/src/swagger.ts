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
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'Server is healthy' } },
      },
    },
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
          '400': { description: 'Duplicate email/username' },
          '429': { description: 'Rate limit exceeded' },
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
                    user: { type: 'object' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
          '403': { description: 'Account pending or banned' },
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
                  userId: { type: 'string' },
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
        summary: 'Get current user',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Current user object' },
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
          { name: 'targetId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'type', in: 'query', required: true, schema: { type: 'string', enum: ['channel', 'dm'] } },
          { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'before', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': {
            description: 'Messages list with pagination',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    messages: { type: 'array', items: { type: 'object' } },
                    hasMore: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/servers/user/{userId}': {
      get: {
        summary: 'Get servers for a user',
        tags: ['Servers'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'List of servers' } },
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
                  userId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Joined successfully' },
          '400': { description: 'Invalid or expired invite code' },
        },
      },
    },
    '/social/friends/{userId}': {
      get: {
        summary: 'Get friends list',
        tags: ['Social'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Friends array' } },
      },
    },
    '/admin/users': {
      get: {
        summary: 'List all users',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Users array with isAdmin field' } },
      },
    },
    '/admin/users/{id}/admin': {
      put: {
        summary: 'Grant or revoke admin privileges',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
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
        responses: { '200': { description: 'Admin status updated' } },
      },
    },
  },
};
