// backend/src/openapi.js

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Horse Racing Prediction API',
    version: '1.0.0',
  },
  servers: [{ url: 'http://localhost:3000' }],
<<<<<<< Updated upstream
  tags: [
    { name: 'Auth' },
    { name: 'Admin Users' },
    { name: 'Tournaments' },
    { name: 'Admin Tournaments' },
  ],
=======
  tags: [{ name: 'Auth' }, { name: 'Admin Users' }],
>>>>>>> Stashed changes
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
        },
      },
      RefreshResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'fullName', 'phoneNumber', 'roleCode'],
        properties: {
          email: { type: 'string', example: 'user@example.com' },
          password: { type: 'string', example: 'password123' },
          fullName: { type: 'string', example: 'Nguyen Van A' },
          phoneNumber: { type: 'string', example: '0900000000' },
          roleCode: {
            type: 'string',
            example: 'SPECTATOR',
            enum: ['HORSE_OWNER', 'JOCKEY', 'SPECTATOR'],
          },
          licenseNumber: { type: 'string', nullable: true },
          weight: { type: 'number', nullable: true, example: 53 },
          bio: { type: 'string', nullable: true },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'user@example.com' },
          password: { type: 'string', example: 'password123' },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      LogoutRequest: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', example: 'user@example.com' },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['email', 'otpCode', 'newPassword', 'confirmPassword'],
        properties: {
          email: { type: 'string', example: 'user@example.com' },
          otpCode: { type: 'string', example: '123456' },
          newPassword: { type: 'string', example: 'newpassword123' },
          confirmPassword: { type: 'string', example: 'newpassword123' },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          fullName: { type: 'string', nullable: true },
          oldPassword: { type: 'string', nullable: true },
          newPassword: { type: 'string', nullable: true },
          weight: { type: 'number', nullable: true },
        },
      },
      ChangeRoleRequest: {
        type: 'object',
        required: ['confirm'],
        properties: {
          roleId: { type: 'integer', nullable: true, example: 1 },
          roleCode: { type: 'string', nullable: true, example: 'ADMIN' },
          confirm: { type: 'boolean', example: true },
        },
      },
      AdminCreateUserRequest: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string', example: 'new.user@example.com' },
          password: { type: 'string', example: 'password123' },
          fullName: { type: 'string', example: 'New User' },
          phoneNumber: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          roleCode: { type: 'string', nullable: true, example: 'SPECTATOR' },
          roleId: { type: 'integer', nullable: true },
          licenseNumber: { type: 'string', nullable: true },
          weight: { type: 'number', nullable: true },
          bio: { type: 'string', nullable: true },
        },
      },
      AdminUpdateUserRequest: {
        type: 'object',
        properties: {
          fullName: { type: 'string', nullable: true },
          phoneNumber: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          licenseNumber: { type: 'string', nullable: true },
          weight: { type: 'number', nullable: true },
          bio: { type: 'string', nullable: true },
          isProfileComplete: { type: 'boolean', nullable: true },
          password: { type: 'string', nullable: true },
        },
      },
<<<<<<< Updated upstream
      Tournament: {
        type: 'object',
        properties: {
          tournamentId: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Spring Derby 2026' },
          description: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['DRAFT', 'OPEN', 'ONGOING', 'FINISHED', 'CANCELLED'],
            example: 'OPEN',
          },
          cancelReason: { type: 'string', nullable: true },
          startAt: { type: 'string', format: 'date-time', nullable: true },
          endAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          _count: {
            type: 'object',
            properties: {
              races: { type: 'integer', example: 0 },
            },
          },
        },
      },
      AdminCreateTournamentRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Spring Derby 2026' },
          description: { type: 'string', nullable: true },
          startAt: { type: 'string', format: 'date-time', nullable: true },
          endAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      AdminUpdateTournamentRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          startAt: { type: 'string', format: 'date-time', nullable: true },
          endAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      AdminChangeTournamentStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['DRAFT', 'OPEN', 'ONGOING', 'FINISHED', 'CANCELLED'],
            example: 'OPEN',
          },
          cancelReason: { type: 'string', nullable: true, example: 'Bad weather' },
        },
      },
      AdminDeleteTournamentRequest: {
        type: 'object',
        properties: {
          reason: { type: 'string', example: 'Bad weather' },
        },
      },
    },
  },
  paths: {
    '/api/tournaments': {
      get: {
        tags: ['Tournaments'],
        summary: 'List public tournaments',
        description: 'Returns only OPEN, ONGOING, and FINISHED tournaments. DRAFT tournaments are hidden from public users.',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tournaments: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Tournament' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/tournaments/{id}': {
      get: {
        tags: ['Tournaments'],
        summary: 'Get public tournament by id',
        description: 'DRAFT tournaments are returned as 404 for public users.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
=======
    },
  },
  paths: {
>>>>>>> Stashed changes
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LogoutRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request OTP for password reset',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get my profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Auth'],
        summary: 'Update my profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin Users'],
        summary: 'List users (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'roleCode',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by role code (e.g. ADMIN)',
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Admin Users'],
        summary: 'Create user (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminCreateUserRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/admin/users/{id}': {
      get: {
        tags: ['Admin Users'],
        summary: 'Get user by id (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Admin Users'],
        summary: 'Update user (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminUpdateUserRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Admin Users'],
        summary: 'Deactivate user (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/admin/users/{id}/toggle-active': {
      patch: {
        tags: ['Admin Users'],
        summary: 'Toggle isActive (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/admin/users/{id}/role': {
      patch: {
        tags: ['Admin Users'],
        summary: 'Change user role (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangeRoleRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
<<<<<<< Updated upstream
    '/api/admin/tournaments': {
      get: {
        tags: ['Admin Tournaments'],
        summary: 'List tournaments (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['DRAFT', 'OPEN', 'ONGOING', 'FINISHED', 'CANCELLED'],
            },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
      post: {
        tags: ['Admin Tournaments'],
        summary: 'Create tournament as DRAFT (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminCreateTournamentRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/admin/tournaments/{id}': {
      get: {
        tags: ['Admin Tournaments'],
        summary: 'Get tournament by id (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not Found' },
        },
      },
      patch: {
        tags: ['Admin Tournaments'],
        summary: 'Update tournament information (admin)',
        description: 'FINISHED and CANCELLED tournaments cannot be modified.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminUpdateTournamentRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not Found' },
          '409': { description: 'Conflict' },
        },
      },
      delete: {
        tags: ['Admin Tournaments'],
        summary: 'Delete or cancel tournament (admin)',
        description: 'Tournaments without races are deleted. Tournaments with races are changed to CANCELLED and require a reason.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminDeleteTournamentRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not Found' },
          '409': { description: 'Conflict' },
        },
      },
    },
    '/api/admin/tournaments/{id}/status': {
      patch: {
        tags: ['Admin Tournaments'],
        summary: 'Change tournament lifecycle status (admin)',
        description: 'Allowed flow: DRAFT -> OPEN -> ONGOING -> FINISHED. Active states may also move to CANCELLED with cancelReason.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminChangeTournamentStatusRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not Found' },
          '409': { description: 'Conflict' },
        },
      },
    },
=======
>>>>>>> Stashed changes
  },
};
