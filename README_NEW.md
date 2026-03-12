# GitLab Time Tracker - Modern SaaS Platform

A modern, scalable multi-user SaaS platform for tracking and visualizing GitLab time entries with enterprise-grade security and Azure deployment.

## Features

- **Multi-User Authentication**: Secure JWT-based authentication with refresh tokens
- **GitLab Integration**: Connect to multiple GitLab instances and projects
- **Secure Token Storage**: GitLab tokens encrypted and stored in Azure Key Vault
- **Time Entry Sync**: Automatic synchronization of time tracking data
- **Advanced Visualizations**: Cumulative time charts, team statistics, and analytics
- **Date Filtering**: Filter by date range, milestone, or team member
- **Caching**: Redis-powered caching for optimal performance
- **Export Capabilities**: CSV, PDF, and Excel report generation
- **Responsive Design**: Modern UI with TailwindCSS and Next.js
- **Azure Ready**: Full Azure deployment support with PostgreSQL, Redis, Key Vault

## Tech Stack

### Backend
- **Node.js** + **TypeScript** + **Express**
- **Prisma ORM** with PostgreSQL
- **Azure Key Vault** for secret management
- **Redis** for caching
- **JWT** authentication

### Frontend
- **Next.js 14** with App Router
- **React** + **TypeScript**
- **TailwindCSS** for styling
- **Recharts** for data visualization
- **React Query** for server state management
- **Zustand** for client state

### Database
- **PostgreSQL** (Azure Database for PostgreSQL)
- Secure row-level access control
- Comprehensive audit logging

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis (optional, for caching)
- Azure account (for production deployment)

### Local Development

1. **Clone the repository**

```bash
git clone <repository-url>
cd gitlab-timetracker
```

2. **Set up PostgreSQL database**

```bash
# Create database
createdb gitlab_timetracker
```

3. **Backend Setup**

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your database credentials

# Run migrations
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate

# Start development server
npm run dev
```

The backend API will be available at `http://localhost:3001`

4. **Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Using Docker Compose

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Project Structure

```
gitlab-timetracker/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utilities
│   │   └── types/          # TypeScript types
│   ├── prisma/             # Database schema & migrations
│   └── Dockerfile
├── frontend/               # Next.js application
│   ├── app/                # Next.js app router pages
│   ├── components/         # React components
│   ├── lib/                # API client & utilities
│   └── Dockerfile
├── shared/                 # Shared TypeScript types
├── infrastructure/         # Azure infrastructure as code
├── .github/workflows/      # CI/CD pipelines
└── docker-compose.yml
```

## Database Schema

- **users**: User accounts
- **refresh_tokens**: JWT refresh tokens
- **gitlab_connections**: GitLab instance connections
- **projects**: Tracked GitLab projects
- **time_entries**: Cached time entries
- **dashboards**: Saved dashboard configurations
- **exports**: Generated reports
- **audit_logs**: Security and compliance logs

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### GitLab Integration
- `POST /api/gitlab/connections` - Add GitLab connection
- `GET /api/gitlab/connections` - List connections
- `DELETE /api/gitlab/connections/:id` - Remove connection
- `GET /api/gitlab/projects` - Fetch GitLab projects
- `POST /api/gitlab/sync/:projectId` - Sync time entries

### Time Entries
- `GET /api/time-entries` - Get time entries
- `GET /api/time-entries/stats` - Get statistics
- `GET /api/time-entries/cumulative` - Get cumulative data

## Deployment

### Azure Deployment

1. **Provision Azure Resources**
   - Azure Database for PostgreSQL Flexible Server
   - Azure Cache for Redis
   - Azure Key Vault
   - Azure App Service (2x - Backend and Frontend)
   - Azure Container Registry
   - Azure Application Insights

2. **Configure Secrets**
   - Set up Azure Key Vault with appropriate access policies
   - Store JWT secrets and database credentials

3. **Deploy with GitHub Actions**
   - Configure Azure credentials in GitHub secrets
   - Push to main branch triggers automatic deployment

### Environment Variables

#### Backend (.env)
```
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
AZURE_KEY_VAULT_NAME=...
REDIS_HOST=...
FRONTEND_URL=https://your-app.azurewebsites.net
```

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-api.azurewebsites.net
```

## Security Features

- **Bcrypt Password Hashing** (cost factor 12)
- **JWT Access Tokens** (15-minute expiry)
- **Refresh Tokens** (7-day expiry with rotation)
- **Azure Key Vault** for GitLab tokens
- **Rate Limiting** on all API endpoints
- **CORS** whitelist configuration
- **Helmet** security headers
- **Input Validation** with Zod schemas
- **SQL Injection Prevention** via Prisma
- **Audit Logging** for sensitive operations

## Migration from Original HTML Version

The original single-file HTML application has been fully migrated to this modern architecture:

- ✅ Time entry parsing logic preserved
- ✅ GitLab API pagination handling migrated
- ✅ Project browser functionality enhanced
- ✅ Date and milestone filtering implemented
- ✅ Cumulative chart calculation migrated
- ✅ Team statistics algorithms preserved
- ✅ All features now with database persistence

## Development Commands

### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run prisma:migrate  # Run database migrations
npm run prisma:studio   # Open Prisma Studio
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

## Testing

```bash
# Backend tests (future implementation)
cd backend && npm test

# Frontend tests (future implementation)
cd frontend && npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

GNU General Public License v3.0

## Support

For issues and questions, please open an issue on GitHub.

## Roadmap

### Phase 1: MVP (Completed)
- ✅ Backend API with authentication
- ✅ Frontend with login/register
- ✅ GitLab integration service
- ✅ Database schema
- ✅ Basic dashboard

### Phase 2: Core Features (In Progress)
- 🔄 Full dashboard with charts
- 🔄 Project browser
- 🔄 Time entry sync
- 🔄 Date filtering

### Phase 3: Advanced Features
- Export functionality (CSV, PDF, Excel)
- Saved dashboard configurations
- Team collaboration features
- Email notifications

### Phase 4: Enterprise
- SSO (SAML, Azure AD)
- Multi-tenancy
- Advanced permissions
- Compliance certifications
