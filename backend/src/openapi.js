// backend/src/openapi.js

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Horse Racing Prediction API',
    version: '1.0.0',
  },
  servers: [{ url: 'http://localhost:3000' }],
  tags: [
    { name: 'Auth' },
    { name: 'Horses' },
    { name: 'Admin Horses' },
    { name: 'Admin Users' },
    { name: 'Tournaments' },
    { name: 'Admin Tournaments' },
    { name: 'Jockey Invitations' },
    { name: 'Predictions' },
    { name: 'Wallet' },
    { name: 'Admin Wallet' },
    { name: 'Admin Races' },
  ],
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
      PlaceBetRequest: {
        type: 'object',
        required: ['raceId', 'betType', 'entryIds', 'betAmount'],
        properties: {
          raceId: { type: 'integer', example: 1 },
          betType: { type: 'string', enum: ['WIN', 'PLACE', 'SHOW', 'QUINELLA', 'EXACTA'], example: 'WIN' },
          entryIds: {
            type: 'array',
            items: { type: 'integer' },
            description: 'WIN/PLACE/SHOW: 1 entry. QUINELLA/EXACTA: 2 entries.',
          },
          betAmount: { type: 'integer', example: 50, minimum: 10 },
        },
      },
      Prediction: {
        type: 'object',
        properties: {
          predictionId: { type: 'integer' },
          spectatorId: { type: 'integer' },
          raceId: { type: 'integer' },
          betType: { type: 'string', enum: ['WIN', 'PLACE', 'SHOW', 'QUINELLA', 'EXACTA'] },
          entryId1: { type: 'integer' },
          entryId2: { type: 'integer', nullable: true },
          betAmount: { type: 'integer' },
          lockedOdds: { type: 'number' },
          status: { type: 'string', enum: ['PENDING', 'WON', 'PARTIAL_WON', 'LOST', 'REFUNDED'] },
          payout: { type: 'integer', nullable: true },
          settledAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PublishResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          race: { type: 'object' },
          settledCount: { type: 'integer' },
        },
      },
      CreateRaceRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Race 1 - Sprint' },
          maxEntries: { type: 'integer', example: 8, default: 8 },
          scheduledAt: { type: 'string', format: 'date-time', nullable: true },
          registrationDeadline: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      UpdateRaceRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Race 1 - Final' },
          maxEntries: { type: 'integer', example: 10 },
          scheduledAt: { type: 'string', format: 'date-time', nullable: true },
          registrationDeadline: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      BulkReviewEntriesRequest: {
        type: 'object',
        required: ['entries'],
        properties: {
          entries: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['entryId', 'status'],
              properties: {
                entryId: { type: 'integer', example: 1 },
                status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                reason: { type: 'string', nullable: true, example: 'Invalid registration' },
              },
            },
          },
        },
      },
      RegistrationGateRequest: {
        type: 'object',
        required: ['isOpen'],
        properties: {
          isOpen: { type: 'boolean', example: true, description: 'true = open registration, false = close' },
        },
      },
      WalletResponse: {
        type: 'object',
        properties: {
          walletId: { type: 'integer' },
          userId: { type: 'integer' },
          balance: { type: 'integer' },
          isFrozen: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      WalletTransaction: {
        type: 'object',
        properties: {
          transactionId: { type: 'integer' },
          walletId: { type: 'integer' },
          amount: { type: 'integer' },
          balanceAfter: { type: 'integer' },
          referenceType: { type: 'string', nullable: true },
          type: { type: 'string' },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AdminAdjustBalanceRequest: {
        type: 'object',
        required: ['amount', 'reason'],
        properties: {
          amount: { type: 'integer', example: 100, description: 'Positive=deposit, Negative=withdraw' },
          reason: { type: 'string', example: 'Compensation for race cancellation' },
        },
      },
      HorseCareerMetrics: {
        type: 'object',
        properties: {
          totalStarts: { type: 'integer', example: 5 },
          wins: { type: 'integer', example: 2 },
          winRate: { type: 'number', example: 40 },
          avgFinishPosition: { type: 'number', nullable: true, example: 2.4 },
          recentFormText: { type: 'string', example: '1-2-4' },
          recentForm: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                raceId: { type: 'integer' },
                raceName: { type: 'string' },
                tournamentId: { type: 'integer', nullable: true },
                tournamentName: { type: 'string', nullable: true },
                scheduledAt: { type: 'string', format: 'date-time', nullable: true },
                finishPosition: { type: 'integer' },
              },
            },
          },
        },
      },
      Horse: {
        type: 'object',
        properties: {
          horseId: { type: 'integer', example: 10 },
          ownerId: { type: 'integer', example: 3 },
          name: { type: 'string', example: 'Storm' },
          breed: { type: 'string', nullable: true, example: 'Arabian' },
          dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
          sex: { type: 'string', nullable: true, example: 'M' },
          color: { type: 'string', nullable: true, example: 'Brown' },
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'INACTIVE'],
            example: 'APPROVED',
          },
          rejectionReason: { type: 'string', nullable: true },
          approvedAt: { type: 'string', format: 'date-time', nullable: true },
          rejectedAt: { type: 'string', format: 'date-time', nullable: true },
          reviewedById: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      HorseWithCareerMetrics: {
        allOf: [
          { $ref: '#/components/schemas/Horse' },
          {
            type: 'object',
            properties: {
              careerMetrics: { $ref: '#/components/schemas/HorseCareerMetrics' },
            },
          },
        ],
      },
      CreateHorseRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Storm' },
          breed: { type: 'string', nullable: true, example: 'Arabian' },
          dateOfBirth: { type: 'string', format: 'date', nullable: true, example: '2020-01-01' },
          sex: { type: 'string', nullable: true, example: 'M' },
          color: { type: 'string', nullable: true, example: 'Brown' },
        },
      },
      ReviewHorseRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' },
          reason: { type: 'string', nullable: true, example: 'Incomplete documentation' },
        },
      },
      SendInvitationRequest: {
        type: 'object',
        required: ['raceId', 'horseId', 'jockeyId'],
        properties: {
          raceId: { type: 'integer', example: 1 },
          horseId: { type: 'integer', example: 3 },
          jockeyId: { type: 'integer', example: 14 },
        },
      },
      RespondInvitationRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['ACCEPTED', 'DECLINED'], example: 'ACCEPTED' },
          declineReason: { type: 'string', nullable: true, example: 'Schedule conflict' },
        },
      },
RefereeSubmitResultRequest: {
        type: 'object',
        required: ['rawResults'],
        properties: {
          rawResults: {
            type: 'array',
            description: 'Danh sách kết quả xếp hạng do Trọng tài nhập',
            items: {
              type: 'object',
              required: ['entryId', 'rank', 'isDnf', 'isDq'],
              properties: {
                entryId: {
                  type: 'integer',
                  description: 'ID lượt đăng ký tham gia trận đấu (vị trí ngựa trong trận)'
                },
                rank: {
                  type: 'integer',
                  description: 'Thứ hạng về đích của ngựa (1, 2, 3...)'
                },
                isDnf: {
                  type: 'boolean',
                  description: 'True nếu ngựa không hoàn thành cuộc đua (Did Not Finish)'
                },
                isDq: {
                  type: 'boolean',
                  description: 'True nếu ngựa bị tước quyền thi đấu do phạm quy (Disqualified)'
                },
              },
            },
          },
        },
      },

      AdminAssignRefereesRequest: {
        type: 'object',
        required: ['refereeAId', 'refereeBId'],
        properties: {
          refereeAId: {
            type: 'integer',
            description: 'Mã ID tài khoản của Trọng tài A'
          },
          refereeBId: {
            type: 'integer',
            description: 'Mã ID tài khoản của Trọng tài B (Không được trùng với A)'
          },
        },
      },

      AdminResolveConflictRequest: {
        type: 'object',
        required: ['finalResults', 'reason'],
        properties: {
          finalResults: {
            type: 'array',
            description: 'Bảng kết quả xếp hạng cuối cùng do Admin quyết định ghi đè',
            items: {
              type: 'object',
              properties: {
                entryId: { type: 'integer' },
                rank: { type: 'integer' },
                isDnf: { type: 'boolean' },
                isDq: { type: 'boolean' }
              }
            },
          },
          reason: {
            type: 'string',
            minLength: 5,
            description: 'Lý do bắt buộc nhập khi Admin can thiệp ghi đè kết quả'
          },
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
    '/api/horses': {
      get: {
        tags: ['Horses'],
        summary: 'List approved horses (public)',
        description: 'Returns only horses with status APPROVED, including career metrics.',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    horses: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/HorseWithCareerMetrics' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Horses'],
        summary: 'Create horse (submit for admin approval)',
        description: 'Horse owner submits a new horse. Initial status is PENDING.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateHorseRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Horse submitted for approval' },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — HORSE_OWNER role required' },
        },
      },
    },
    '/api/horses/mine': {
      get: {
        tags: ['Horses'],
        summary: 'List my horses (horse owner)',
        description: 'Returns all horses owned by the authenticated user (any status), including career metrics.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    horses: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/HorseWithCareerMetrics' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — HORSE_OWNER role required' },
        },
      },
    },
    '/api/horses/{id}': {
      get: {
        tags: ['Horses'],
        summary: 'Get approved horse by id (public)',
        description: 'Only APPROVED horses are visible. Returns 404 for pending/rejected horses.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    horse: { $ref: '#/components/schemas/HorseWithCareerMetrics' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Horse not found or not approved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
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
              enum: ['ALL', 'DRAFT', 'OPEN', 'ONGOING', 'FINISHED', 'CANCELLED'],
            },
            description: 'Use ALL or omit this query parameter to return every status.',
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
    '/api/admin/horses': {
      get: {
        tags: ['Admin Horses'],
        summary: 'List horses for admin review',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED', 'ALL'],
            },
            description: 'Filter by horse status. Omit or use ALL for all statuses.',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    horses: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Horse' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — ADMIN role required' },
        },
      },
    },
    '/api/admin/horses/{id}': {
      get: {
        tags: ['Admin Horses'],
        summary: 'Get horse by id (admin)',
        description: 'Returns any horse regardless of status, including career metrics.',
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
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    horse: { $ref: '#/components/schemas/HorseWithCareerMetrics' },
                  },
                },
              },
            },
          },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — ADMIN role required' },
          '404': { description: 'Not Found' },
        },
      },
    },
    '/api/admin/horses/{id}/status': {
      patch: {
        tags: ['Admin Horses'],
        summary: 'Approve or reject a horse',
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
              schema: { $ref: '#/components/schemas/ReviewHorseRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Horse review updated successfully' },
          '400': { description: 'Bad Request — reason required when rejecting' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — ADMIN role required' },
          '404': { description: 'Not Found' },
        },
      },
    },
    '/api/invitations/jockeys': {
      get: {
        tags: ['Jockey Invitations'],
        summary: 'Search validated jockeys with complete profiles',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'name', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by jockey name' }
        ],
        responses: { '200': { description: 'Success' } }
      }
    },
    '/api/invitations': {
      get: {
        tags: ['Jockey Invitations'],
        summary: 'Get inbox or outbox invitations based on user identity',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'] }, description: 'Filter by status' }
        ],
        responses: { '200': { description: 'Success' } }
      },
      post: {
        tags: ['Jockey Invitations'],
        summary: 'Horse Owner sends a racing invitation to a Jockey',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SendInvitationRequest' } } }
        },
        responses: { '201': { description: 'Sent successfully' } }
      }
    },
    '/api/invitations/{id}/respond': {
      put: {
        tags: ['Jockey Invitations'],
        summary: 'Jockey accepts or declines an invitation',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RespondInvitationRequest' } } }
        },
        responses: { '200': { description: 'Responded successfully' } }
      }
    },
    '/api/invitations/{id}/confirm': {
      post: {
        tags: ['Jockey Invitations'],
        summary: 'Horse Owner finalizes jockey selection and auto-cancels alternatives',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Confirmed successfully' } }
      }
    },

    // ---- Prediction Endpoints ----

    '/api/predictions': {
      post: {
        tags: ['Predictions'],
        summary: 'Spectator places a bet (WIN/PLACE/SHOW/QUINELLA/EXACTA)',
        description: 'WIN/PLACE/SHOW: pick 1 entry. QUINELLA/EXACTA: pick 2 entries. Minimum 10 points, maximum 50% of wallet balance. Odds locked at bet time.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PlaceBetRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Bet placed successfully' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not Found' },
          '409': { description: 'Conflict' },
        },
      },
      get: {
        tags: ['Predictions'],
        summary: 'List my predictions',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/predictions/{id}': {
      get: {
        tags: ['Predictions'],
        summary: 'Get prediction detail',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not Found' },
        },
      },
    },
    '/api/predictions/{id}/cancel': {
      put: {
        tags: ['Predictions'],
        summary: 'Cancel a PENDING prediction (100% refund)',
        description: 'Only allowed if the race is still SCHEDULED.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Cancelled and refunded' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '409': { description: 'Conflict - race already started or prediction already settled' },
        },
      },
    },

    // ---- Admin Race Publish/Unpublish ----

    '/api/admin/races/{raceId}/publish': {
      post: {
        tags: ['Admin - Quản lý trận đua & Quyết toán'],
        summary: 'Công bố kết quả trận đấu và tự động trả thưởng về ví (Admin Only)',
        description: 'Mở Database Transaction duy nhất: quét vé cược PENDING, đối chiếu điều kiện xếp hạng Top 3 để phân định Thắng/Thua, tự động trích nộp 10% House Margin phí vận hành sàn, bù trừ thâm hụt vào Quỹ dự phòng (Treasure Pool), thực thi lệnh cộng ví điểm cho Spectator thắng cược và bắn tín hiệu Socket real-time cập nhật số dư ví tức thì.',
        security: [
          {
            bearerAuth: []
          }
        ],
        parameters: [
          {
            name: 'raceId',
            in: 'path',
            required: true,
            description: 'Mã ID (số nguyên tăng tự động) của trận đua cần xuất bản kết quả',
            schema: {
              type: 'integer',
              example: 1
            }
          }
        ],
        responses: {
          200: {
            description: 'Công bố kết quả thành công, dòng tiền tài chính và trạng thái trận đấu đã hoàn tất cập nhật.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Công bố kết quả trận đấu và quyết toán tiền thưởng thành công trọn vẹn.' },
                    data: {
                      type: 'object',
                      properties: {
                        raceId: { type: 'integer', example: 1 },
                        status: { type: 'string', example: 'FINISHED' },
                        financialSummary: {
                          type: 'object',
                          properties: {
                            totalPoolBet: { type: 'integer', example: 90000 },
                            houseMarginCollected: { type: 'integer', example: 9000 },
                            netPoolForPayout: { type: 'integer', example: 81000 },
                            actualTotalPayout: { type: 'integer', example: 75000 },
                            treasureBalanceChange: { type: 'integer', example: 6000 }
                          }
                        },
                        winnersCount: { type: 'integer', example: 5 },
                        publishedAt: { type: 'string', format: 'date-time', example: '2026-07-07T14:40:00.000Z' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: {
            description: 'Trận đấu không nằm ở trạng thái PENDING_RESULT hoặc thiếu bảng dữ liệu OfficialRaceResult.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Trận đấu phải ở trạng thái PENDING_RESULT để thực hiện quyết toán.' }
                  }
                }
              }
            }
          },
          401: { description: 'Yêu cầu Token xác thực JWT đầu vào bị thiếu hoặc sai cấu trúc.' },
          403: { description: 'Quyền truy cập bị từ chối do tài khoản của bạn không có Role hành động là Admin.' }
        }
      }
    },

    '/api/admin/races/{raceId}/unpublish': {
      post: {
        tags: ['Admin - Quản lý trận đua & Quyết toán'],
        summary: 'Thu hồi kết quả trận đấu và hoàn tác điểm ví (Admin Only)',
        description: 'Mở Database Transaction nguyên tố nhằm đảo ngược dòng tiền: quét lại các vé cược đã WON để trừ lại số tiền thưởng khỏi PointWallet của Spectator (chấp nhận ví âm điểm), ghi nhận lịch sử BET_WIN_REVERSAL, hoàn tác phân phối dòng tiền tại Quỹ doanh thu nhà cái và Quỹ dự phòng, xóa kết quả phẳng và chuyển trạng thái trận đấu từ FINISHED quay ngược về PENDING_RESULT.',
        security: [
          {
            bearerAuth: []
          }
        ],
        parameters: [
          {
            name: 'raceId',
            in: 'path',
            required: true,
            description: 'Mã ID của trận đua cần thu hồi kết quả và dòng tiền',
            schema: {
              type: 'integer',
              example: 1
            }
          }
        ],
        responses: {
          200: {
            description: 'Thu hồi kết quả và hoàn tác dòng tiền thành công. Trận đấu đã quay về trạng thái PENDING_RESULT.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Thu hồi kết quả trận đấu, đóng gói hoàn tác ví và các quỹ hệ thống thành công.' },
                    data: {
                      type: 'object',
                      properties: {
                        raceId: { type: 'integer', example: 1 },
                        status: { type: 'string', example: 'PENDING_RESULT' },
                        recalledTotalPayout: { type: 'integer', example: 75000 },
                        affectedWinnersCount: { type: 'integer', example: 5 }
                      }
                    }
                  }
                }
              }
            }
          },
          400: {
            description: 'Yêu cầu thất bại (Ví dụ: Trận đấu chưa ở trạng thái FINISHED).',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Chỉ có thể thu hồi trận đấu đã kết thúc (FINISHED).' }
                  }
                }
              }
            }
          },
          401: { description: 'Token JWT bị thiếu hoặc sai định dạng.' },
          403: { description: 'Tài khoản không có vai trò Admin để thực hiện hành động này.' }
        }
      }
    },

'/api/admin/tournaments/{tournamentId}/races': {
  get: {
    tags: ['Admin Races'],
    summary: 'List races by tournament',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'tournamentId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
    ],
    responses: {
      '200': { description: 'List races successfully' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Tournament not found' },
    },
  },

  post: {
    tags: ['Admin Races'],
    summary: 'Create a race',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'tournamentId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
          },
        },
      },
    },
    responses: {
      '201': { description: 'Race created successfully' },
      '400': { description: 'Invalid request data' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
    },
  },
},

'/api/admin/races/{id}': {
  get: {
    tags: ['Admin Races'],
    summary: 'Get race details',
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
      '200': { description: 'Race details' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Race not found' },
    },
  },

  patch: {
    tags: ['Admin Races'],
    summary: 'Update a race',
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
          schema: {
            type: 'object',
          },
        },
      },
    },
    responses: {
      '200': { description: 'Race updated successfully' },
      '400': { description: 'Invalid request data' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Race not found' },
    },
  },

  delete: {
    tags: ['Admin Races'],
    summary: 'Delete a race',
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
      '200': { description: 'Race deleted successfully' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Race not found' },
    },
  },
},

'/api/admin/races/{id}/entries': {
  get: {
    tags: ['Admin Races'],
    summary: 'List all race entries',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string' },
      },
    ],
    responses: {
      '200': { description: 'List race entries' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Race not found' },
    },
  },
},

'/api/admin/races/{id}/bulk-review': {
  post: {
    tags: ['Admin Races'],
    summary: 'Bulk approve or reject race entries',
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
          example: {
            entries: [
              {
                entryId: 1,
                status: 'APPROVED',
              },
              {
                entryId: 2,
                status: 'REJECTED',
                reason: 'Invalid registration',
              },
            ],
          },
        },
      },
    },
    responses: {
      '200': { description: 'Bulk review completed' },
      '400': { description: 'Invalid request data' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
    },
  },
},

'/api/admin/races/{id}/registration-gate': {
  put: {
    tags: ['Admin Races'],
    summary: 'Open or close registration gate',
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
          example: {
            registrationOpen: true,
          },
        },
      },
    },
    responses: {
      '200': { description: 'Registration gate updated' },
      '400': { description: 'Invalid request data' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Race not found' },
    },
  },
},

    // ---- Wallet Endpoints ----

    '/api/wallet': {
      get: {
        tags: ['Wallet'],
        summary: 'Get my wallet balance and status',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { wallet: { $ref: '#/components/schemas/WalletResponse' } } } } } },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Wallet not found' },
        },
      },
    },
    '/api/wallet/transactions': {
      get: {
        tags: ['Wallet'],
        summary: 'Get my transaction history (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
        },
      },
    },

    // ---- Admin Wallet Endpoints ----

    '/api/admin/wallets/{userId}/adjust': {
      post: {
        tags: ['Admin Wallet'],
        summary: 'Admin manually deposit or withdraw points',
        description: 'Reason is required. Withdrawals check for sufficient balance.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminAdjustBalanceRequest' } } },
        },
        responses: {
          '200': { description: 'Balance adjusted' },
          '400': { description: 'Bad Request / Insufficient balance' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'User wallet not found' },
          '409': { description: 'Wallet frozen' },
        },
      },
    },
    '/api/admin/wallets/transactions': {
      get: {
        tags: ['Admin Wallet'],
        summary: 'Admin view all wallet transactions',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/admin/wallets/{userId}/transactions': {
      get: {
        tags: ['Admin Wallet'],
        summary: 'Admin view transactions for a specific user',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },

    // ---- Referee Endpoints ----

    '/api/referee/races/{id}/start': {
      post: {
        tags: ['Referee Management'],
        summary: 'Referee starts the assigned race (SCHEDULED -> IN_PROGRESS)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Race started and bets are locked' },
          '400': { description: 'Bad Request / Invalid race state' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/referee/races/{id}/submit': {
      post: {
        tags: ['Referee Management'],
        summary: 'Referee blind submits race ranks and statuses',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefereeSubmitResultRequest' } } },
        },
        responses: {
          '200': { description: 'Result submitted successfully' },
          '400': { description: 'Bad Request / Already submitted' },
          '401': { description: 'Unauthorized' },
        },
      },
    },

    // ---- Admin Referee Control Endpoints ----

    '/api/admin/races/{id}/assign-referees': {
      post: {
        tags: ['Admin Races'],
        summary: 'Admin assigns two distinct referees to a scheduled race',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminAssignRefereesRequest' } } },
        },
        responses: {
          '200': { description: 'Referees assigned successfully' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/api/admin/races/{id}/review-conflict': {
      get: {
        tags: ['Admin Races'],
        summary: 'Admin reviews side-by-side referee submissions for a paused race',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Race not found or not in PAUSED state' },
        },
      },
    },
    '/api/admin/races/{id}/resolve-conflict': {
      post: {
        tags: ['Admin Races'],
        summary: 'Admin overwrites the final result and provides a mandatory reason',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminResolveConflictRequest' } } },
        },
        responses: {
          '200': { description: 'Conflict resolved and race moved to PENDING_RESULT' },
          '400': { description: 'Bad Request / Reason too short' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
  },
};
