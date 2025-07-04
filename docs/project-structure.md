# Slate Project - NestJS Structure Proposal

backend/
├── .env
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── jest.config.js
├── prisma/
│   ├── schema.prisma          # Prisma schema matching ERD
│   └── migrations/            # Generated DB migrations
│
├── src/
│   ├── main.ts                # Application entry point
│   ├── app.module.ts          # Root module
│   │
│   ├── common/                # Reusable components
│   │   ├── decorators/        # Custom decorators
│   │   ├── filters/           # Exception filters
│   │   ├── guards/            # Auth guards
│   │   ├── interceptors/      # Request interceptors
│   │   ├── middleware/        # Global middleware
│   │   └── pipes/             # Validation pipes
│   │
│   ├── config/                # Configuration management
│   │   ├── app.config.ts      # Main configuration
│   │   ├── database.config.ts
│   │   ├── auth.config.ts
│   │   └── swagger.config.ts  # API documentation
│   │
│   ├── core/                  # Fundamental modules
│   │   ├── database/
│   │   │   └── prisma.service.ts  # Prisma service
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   ├── cache/             # Redis caching
│   │   ├── mailer/            # Email service
│   │   └── upload/            # File upload service
│   │
│   ├── modules/               # Feature modules
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── dto/           # Data transfer objects
│   │   │   ├── entities/      # TypeScript interfaces
│   │   │   └── schemas/       # Validation schemas
│   │   │
│   │   ├── workspace/
│   │   ├── projects/
│   │   ├── issues/
│   │   ├── comments/
│   │   ├── notifications/
│   │   ├── automation/
│   │   ├── integrations/
│   │   ├── analytics/
│   │   └── search/
│   │
│   ├── shared/                # Common utilities
│   │   ├── utils/             # Helper functions
│   │   ├── constants/         # App-wide constants
│   │   ├── enums/             # All enums
│   │   └── types/             # Global type definitions
│   │
│   └── migrations/            # Data migration scripts
│
├── test/                      # Test suites
│   ├── e2e/                   # End-to-end tests
│   └── unit/                  # Unit tests
│
├── public/                    # Static assets
├── scripts/                   # Deployment/maintenance scripts
└── docker/                    # Dockerfiles
    ├── app.Dockerfile
    └── db.Dockerfile
