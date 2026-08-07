export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DRHGA API',
    version: '1.0.0',
    description: 'API para Centro Escolar Dr. Hermogenes Alvarado',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development server',
    },
  ],
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'user', 'student', 'teacher'] },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          subject: { type: 'string' },
          category: { type: 'string' },
          message: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Gallery: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          image_url: { type: 'string' },
          sort_order: { type: 'integer' },
        },
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          news: { type: 'string' },
          description: { type: 'string' },
          event_date: { type: 'string', format: 'date' },
          event_time: { type: 'string', format: 'time' },
          image_url: { type: 'string' },
          location: { type: 'string' },
          map_iframe: { type: 'string' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        responses: {
          200: { description: 'API is running' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout',
        tags: ['Auth'],
        responses: {
          200: { description: 'Logout successful' },
        },
      },
    },
    '/api/me': {
      get: {
        summary: 'Get current user',
        tags: ['Auth'],
        responses: {
          200: { description: 'Current user' },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/api/gallery': {
      get: {
        summary: 'Get all gallery items',
        tags: ['Gallery'],
        responses: {
          200: { description: 'List of gallery items' },
        },
      },
      post: {
        summary: 'Create gallery item (admin only)',
        tags: ['Gallery'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Gallery' },
            },
          },
        },
        responses: {
          201: { description: 'Gallery item created' },
          401: { description: 'Not authenticated' },
          403: { description: 'Not admin' },
        },
      },
    },
    '/api/gallery/{id}': {
      put: {
        summary: 'Update gallery item (admin only)',
        tags: ['Gallery'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Gallery' },
            },
          },
        },
        responses: {
          200: { description: 'Gallery item updated' },
          401: { description: 'Not authenticated' },
          403: { description: 'Not admin' },
        },
      },
      delete: {
        summary: 'Delete gallery item (admin only)',
        tags: ['Gallery'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Gallery item deleted' },
          401: { description: 'Not authenticated' },
          403: { description: 'Not admin' },
        },
      },
    },
    '/api/events': {
      get: {
        summary: 'Get all events',
        tags: ['Events'],
        responses: {
          200: { description: 'List of events' },
        },
      },
      post: {
        summary: 'Create event (admin only)',
        tags: ['Events'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Event' },
            },
          },
        },
        responses: {
          201: { description: 'Event created' },
          401: { description: 'Not authenticated' },
          403: { description: 'Not admin' },
        },
      },
    },
    '/api/messages': {
      post: {
        summary: 'Create message',
        tags: ['Messages'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Message' },
            },
          },
        },
        responses: {
          201: { description: 'Message created' },
        },
      },
      get: {
        summary: 'Get all messages (admin only)',
        tags: ['Messages'],
        responses: {
          200: { description: 'List of messages' },
          401: { description: 'Not authenticated' },
          403: { description: 'Not admin' },
        },
      },
    },
    '/api/messages/{id}': {
      delete: {
        summary: 'Delete message (admin only)',
        tags: ['Messages'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Message deleted' },
          401: { description: 'Not authenticated' },
          403: { description: 'Not admin' },
        },
      },
    },
    '/api/me/messages': {
      get: {
        summary: 'Get user messages',
        tags: ['Messages'],
        responses: {
          200: { description: 'User messages' },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/api/reviews': {
      get: {
        summary: 'Get all reviews',
        tags: ['Reviews'],
        responses: {
          200: { description: 'List of reviews' },
        },
      },
      post: {
        summary: 'Create review',
        tags: ['Reviews'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Review' },
            },
          },
        },
        responses: {
          201: { description: 'Review created' },
        },
      },
    },
    '/api/reviews/{id}': {
      delete: {
        summary: 'Delete review (admin only)',
        tags: ['Reviews'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Review deleted' },
          401: { description: 'Not authenticated' },
          403: { description: 'Not admin' },
        },
      },
    },
  },
}
