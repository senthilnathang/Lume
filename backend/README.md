# Gawdesy Backend

Modular Express.js backend API with dynamic database support (MySQL/PostgreSQL).

## Features

- **Modular Architecture** - Each feature is organized as a standalone module
- **Dynamic Database** - Switch between MySQL and PostgreSQL via environment variable
- **JWT Authentication** - Secure token-based authentication with refresh tokens
- **Role-Based Access Control** - Granular permissions system
- **Soft Deletes** - Data preservation with deleted_at timestamps
- **Rate Limiting** - Protection against abuse
- **Audit Logging** - Track all important actions
- **Responsive API** - Consistent response format with pagination

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+ or PostgreSQL 14+
- npm or yarn

### Installation

```bash
cd /opt/gawdesy.com/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev
```

### Production Build

```bash
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 3000 |
| DB_TYPE | Database type (mysql/postgres) | mysql |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 3306/5432 |
| DB_NAME | Database name | gawdesy |
| DB_USER | Database user | gawdesy |
| DB_PASSWORD | Database password | gawdesy |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | Token expiration | 7d |

## Project Structure

```
backend/
├── src/
│   ├── api/                    # API layer
│   │   ├── middleware/         # Express middleware
│   │   ├── validators/         # Request validation
│   │   └── routes/             # Route definitions
│   ├── core/                   # Core functionality
│   │   └── middleware/         # Auth, error handling
│   ├── database/               # Database layer
│   │   ├── config.js           # Database configuration
│   │   └── models/             # Model definitions
│   ├── modules/                # Feature modules
│   │   ├── user/               # User management
│   │   ├── auth/               # Authentication
│   │   ├── activities/         # Activities/events
│   │   ├── donations/          # Donations
│   │   ├── documents/          # Documents
│   │   ├── team/              # Team members
│   │   ├── messages/          # Messages
│   │   ├── settings/          # Settings
│   │   └── audit/             # Audit logs
│   ├── scripts/               # Utility scripts
│   ├── shared/                # Shared code
│   │   ├── constants/         # Application constants
│   │   └── utils/             # Utility functions
│   └── index.js              # Entry point
├── package.json
└── .env
```

## Available Scripts

```bash
npm run dev              # Start development server
npm run dev:mysql       # Start with MySQL
npm run dev:postgres     # Start with PostgreSQL
npm start               # Start production server
npm run db:seed         # Seed sample data
npm run db:admin        # Create admin user
npm run db:refresh      # Refresh database
```

## API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /api/activities` - List activities
- `GET /api/team/active` - Active team members
- `GET /api/settings/public` - Public settings

### Authentication
- `POST /api/users/register` - Register user
- `POST /api/users/login` - Login
- `POST /api/auth/refresh-token` - Refresh token

### Protected Endpoints
All protected endpoints require JWT token in Authorization header.

## Admin Credentials

- **Email:** admin@gawdesy.org
- **Password:** Admin@123

## Database Schema

The application uses Sequelize ORM with the following models:

1. **Users** - User accounts with authentication
2. **Roles** - User roles (super_admin, admin, manager, staff, user, guest)
3. **Permissions** - Granular permissions
4. **Activities** - Events and programs
5. **Donations** - Donation records
6. **Donors** - Donor information
7. **Campaigns** - Donation campaigns
8. **Documents** - File management
9. **Team Members** - Team directory
10. **Messages** - Contact messages
11. **Settings** - Application settings
12. **Audit Logs** - Action logging

## Contributing

1. Create a feature module following the existing pattern
2. Add routes, service, and model
3. Update database/models/index.js with associations
4. Add unit tests
5. Update documentation

## License

MIT
