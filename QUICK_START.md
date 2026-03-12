# Quick Start Guide - GitLab Time Tracker

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or use Docker)

### Option 1: Docker Compose (Recommended for Production)

**Note:** If you encounter Docker permission issues, use Option 2 below.

```bash
# 1. Clone and navigate
cd gitlab-timetracker

# 2. Fix Docker permissions (Linux only)
sudo usermod -aG docker $USER
# Log out and log back in

# 3. Start all services
docker-compose up -d

# 4. Wait 30 seconds for services to initialize
sleep 30

# 5. Open your browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/health
```

That's it! Register a new account and start tracking.

### Option 2: Local Development (Recommended for Development)

**Start PostgreSQL first:**
```bash
# Ubuntu/Debian:
sudo service postgresql start

# macOS:
brew services start postgresql@15

# Create database:
sudo -u postgres createdb gitlab_timetracker
```

**Terminal 1 - Backend:**
```bash
# Navigate to backend
cd gitlab-timetracker/backend

# Install dependencies
npm install

# Set up database
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
# Navigate to frontend
cd gitlab-timetracker/frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start development server
npm run dev
```

**Terminal 3 - Services (if not using Docker):**
```bash
# Start PostgreSQL (if not already running)
# Start Redis (optional, for caching)
redis-server
```

### First Time Setup

1. **Register Account**
   - Go to http://localhost:3000
   - Click "Sign up"
   - Create your account

2. **Add GitLab Connection**
   - Get a personal access token from GitLab
   - Required scopes: `read_api`
   - Add connection in the dashboard

3. **Select Project**
   - Browse your GitLab projects
   - Select a project to track
   - Click "Sync" to fetch time entries

4. **View Dashboard**
   - See cumulative time charts
   - View team statistics
   - Filter by date range
   - Export to CSV

### Troubleshooting

**Backend won't start:**
```bash
# Check PostgreSQL is running
pg_isready

# Check database URL in .env
echo $DATABASE_URL

# Reset database
npx prisma migrate reset
```

**Frontend connection error:**
```bash
# Verify backend is running
curl http://localhost:3001/health

# Check NEXT_PUBLIC_API_URL in .env.local
cat frontend/.env.local
```

**Can't sync from GitLab:**
- Verify your access token has `read_api` scope
- Check GitLab URL is correct (include https://)
- Ensure you have access to the project

### Key Files to Configure

1. `backend/.env`:
   - `DATABASE_URL` - PostgreSQL connection
   - `JWT_SECRET` - Change in production
   - `REDIS_HOST` - If using Redis

2. `frontend/.env.local`:
   - `NEXT_PUBLIC_API_URL` - Backend URL

### Development Commands

```bash
# Backend
npm run dev          # Development server
npm run build        # Production build
npm run prisma:studio # Database GUI

# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Check code quality
```

### What's Next?

- 📖 Read [README_NEW.md](README_NEW.md) for full documentation
- ☁️ Follow [infrastructure/azure-deployment.md](infrastructure/azure-deployment.md) to deploy
- 🔧 Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details

### Need Help?

- Check application logs in the terminal
- Review error messages in browser console
- Open an issue on GitHub
- Refer to the full documentation

### Production Deployment

For production Azure deployment:
1. Follow `infrastructure/azure-deployment.md`
2. Set up GitHub Actions with Azure credentials
3. Push to main branch for automatic deployment

Estimated setup time for Azure: 1-2 hours
Monthly cost: ~$75-115

---

Happy time tracking! 🎉
